/*global WildRydes _config*/

(function rideScopeWrapper($) {
	let WildRydes = window.WildRydes || {};

	let authToken;

	WildRydes.authToken.then(function setAuthToken(token) {
		if (token) 	{ authToken = token; }
		else 		{ window.location.href = '/signin.html'; 	}
	}).catch(function handleTokenError(error) {
		alert(error);
		window.location.href = '/signin.html';
	});

	// Register click handler for #request button
	$(function onDocReady() {
		WildRydes.authToken.then((token) => {
			if (token) { console.log(`You are authenticated. Your token is: ${token}`); }
		});

		if (!_config.api.invokeUrl) { $('#noApiMessage').show(); }

		fetch('https://raw.githubusercontent.com/gtjames/csv/master/Dictionaries/five.txt')
			.then(resp => resp.text())
			.then(words => initializeGame(words) )
	});

	let fiveLetters, hiddenWord, unused = [], close = [[],[],[],[],[]];
	let match = ['_','_','_','_','_'];
	let lock  = ['_','_','_','_','_'];
	let guess = '';
	let gameKey;
	let userName = localStorage.getItem("userName");
	let timerId = -1;

	document.getElementById("userName").value = userName;
	let competition 	= document.getElementById('competition');
	let userAttempts 	= document.getElementById('userAttempts');
	let secretWord 		= document.getElementById('secretWord');
	let possibleWords 	= document.getElementById('possibleWords');
	let error 			= document.getElementById('error');
	let tryThis 		= document.getElementById('tryThis');

	document.getElementById('newUser').addEventListener('click', newUser);
	document.getElementById('eliminate').addEventListener('click', search);
	window.addEventListener('keydown', readKey);

	function readKey(e) {
		if (e.keyCode === 8) {
			guess = guess.substr(0,guess.length-1);
			document.getElementById(guess.length+"").innerText = '';
			return;
		} else if (e.keyCode === 13) {
			search();
			return;
		}
		//	ignore anything besides a-z and A-Z
		if ( e.keyCode < 65 || e.keyCode > 90) {
			console.log(e.keyCode);
			return;
		}
		let letter = String.fromCharCode(e.keyCode);

		if (guess.length === 5)
			return;

		document.getElementById(guess.length+"").innerText = letter;
		guess += letter;
	}

	function newUser() {
		userName = document.getElementById("userName").value;
		gameKey = document.getElementById("gameKey").value;
		createGame(userName, gameKey);
		if (timerId !== -1)
			clearTimeout(timerId);

		timerId = setInterval(()=>{ getOtherMoves() }, 5000);
	}

	function search() {
		let match = ['_','_','_','_','_'];
		let attempt = '';

		for (let i = 0; i < 5; i++) {
			attempt += document.getElementById(i+"").innerText;
		}

		error.innerText = '';
		if ( fiveLetters.find(w => w === attempt) !== attempt) {
			error.innerText = `${attempt}: is not a valid word`;
			return;
		}

		for (let g = 0; g < 5; g++) {
			let found = false;
			for (let h = 0; h < 5; h++) {
				if (hiddenWord[h] === attempt[g]) {
					found = true;
					if (match[g] === 'e') continue;
					match[g] = (h === g) ? 'e' : 'c';
					setActive(attempt[g], match[g]);
					if (match[g] === 'e') lock[g] = attempt[g];
					if (match[g] === 'c') close[g].push(attempt[g]);
				}
			}
			if (!found) {
				setActive(attempt[g], '_');
				unused.push(attempt[g]);
			}
		}

		findPossibles(unused, lock, match);
		userAttempts.innerHTML += postAttempt(match, attempt)
		makeAMove(match, attempt);
		for (let i = 0; i < 5; i++) {
			document.getElementById(i+"").innerText = '';
		}
		guess = '';
		if (attempt === hiddenWord) {
			hiddenWord = selectRandomWord();
			secretWord.innerHTML = `${hiddenWord}`;
			userAttempts.innerHTML = ``;
			close = [[],[],[],[],[]];
			lock  = ['_','_','_','_','_'];
			unused = [];
		}
	}

	function postAttempt(match, attempt) {
		let button ='';
		for (let h = 0; h < 5; h++) {
			button += `<button class="${match[h]}">${attempt[h]}</button>`;
		}
		return `<div class="row">${button}</div>`;
	}

	function createGame(userName, gameKey) {
		fetch("https://slcrbpag33.execute-api.us-west-1.amazonaws.com/prod", {
			method: 'POST',
			body: JSON.stringify({ "userName" : userName, "gameKey" : gameKey,})
		})
			.then(resp => resp.json())
			.then((data) => console.log(data))
			.catch(err => console.log('Fetch Error :', err) );
	}

	function getOtherMoves() {
		fetch(`https://slcrbpag33.execute-api.us-west-1.amazonaws.com/prod/players`,
			{
				method: "POST",
				body: JSON.stringify({"gameKey": gameKey})
			})
			.then(resp => resp.json())
			.then(games => {
				let allPlayers = games.filter(p => p.userName !== userName && p.moves.length > 0);
				competition.innerHTML = '';
				allPlayers.forEach(player => {
					let card = `<div class="w3-col m4 l3 disney-card w3-theme-d1">
									<h4>${player.userName}</h4>
									<table>`;
					player.moves.forEach(m => {
						let match  = m.split('').filter((x,idx) => idx % 2 === 0);
						let filler = m.split('').filter((x,idx) => idx % 2 === 1);
						card += postAttempt(match, filler);
					})
					competition.innerHTML += `${card}</table></div>`;
				})
			})
			.catch(err => console.log('Fetch Error :', err) );
	}

	function makeAMove(match, attempt) {
		let move = '';
		for(let i = 0; i < 5; i++) {
			move += match[i] + attempt[i];
		}

		//       fetch("https://slcrbpag33.execute-api.us-west-1.amazonaws.com/prod", {
		fetch(_config.api.invokeUrl, {
			method: 'PUT',
			headers: { Authorization: authToken },
			body: JSON.stringify({ userName : userName, gameKey: gameKey, move: move }),
			contentType: 'application/json',
		})
			.then(resp => resp.json())
			.then((result) => completeRequest(result))
			.catch(err => console.log('Fetch Error :', err) );
	}

	function completeRequest(result) {
		console.log('Response received from API: ', JSON.stringify(result));
	}

	function initializeGame(words) {
		fiveLetters = words.split('\n');
		hiddenWord = selectRandomWord();
		secretWord.innerHTML = `${hiddenWord}`;
	}

	function selectRandomWord() {
		let index = Math.floor(Math.random() * fiveLetters.length);
		return fiveLetters[index];
	}

	function findPossibles(unused, lock, match) {
		lock = Array.from(new Set(lock.join('').split('')))
		unused = Array.from(new Set(unused.join('').split('')))
		for (let i = 0; i < 5; i++) {
			close[i] = Array.from(new Set(close[i].join('').split('')))
		}
		let possibles = fiveLetters;
		//  eliminate all words that contain an unused letter
		possibles = possibles.filter(w => {
			for (let un of unused) {
				if (w.indexOf(un) >= 0)
					return false;           //  contains an unused letter
			}
			return true;                    //  free of all unused letters
		});

		//  find the words that match position and letter
		possibles = possibles.filter(w => {
			for (let i = 0; i < 5; i++) {
				if ((match[i] === 'e' && lock[i] !== w.charAt(i)))
					return false;           //  this word doesn't have a matching letter in a required position
			}
			return true;                    //  all required letters are accounted for
		});

		//  find words that have all of the possible letters
		possibles = possibles.filter(word => {
			for (const [index, position] of close.entries()) {
				for (let c of position) {
					if (word.indexOf(c) === -1 || word.indexOf(c) === index)
						return false;           //  does not contain a close letter
				}
			}
			return true;                    //  contains all close letters
		});

		let text = '';
		for (let w of possibles) {
			text += `<li>${w}</li>`;
		}
		tryThis.innerHTML = text;
		possibleWords.innerHTML = `Possibles ${possibles.length}<br>`;
		return possibles.length;
	}

	function setActive(letter, status) {
		// use querySelectorAll to get all of the type li elements
		const allTypes = document.querySelectorAll("div.row > button");
		allTypes.forEach((item) => {
			// check to see if this is the one to make active
			if (item.dataset.key === letter) {
				item.classList.add(status);
			}
		});
	}

	function displayUpdate(text) {
		$('#updates').append($('<li>' + text + '</li>'));
	}

	/*
	function eliminate() {
		let letter, attempt = '';
		for (let i = 0; i < 5; i++) {
			letter = document.getElementById(i+"").innerText;
			if ( letter >= 'A' && letter <= 'Z') {
				lock[i] = letter;
				match[i] = 'e';
				setActive(letter, 'e');
				attempt += letter;
			}
			if ( letter >= 'a' && letter <= 'z')    {
				close.push(letter);
				if (match[i] !== 'c') match[i] = 'c';
				attempt += letter;
				setActive(letter, match[i]);
			}
			if (letter[0] === '!') {
				attempt += letter.charAt(1);
				setActive(letter.charAt(1), '_');
				unused.push(letter.charAt(1));
			}
		}
		findPossibles(attempt, unused, lock, match);
		userAttempts.innerHTML += postAttempt(match, attempt)
		makeAMove(match, attempt);
	}
	 */

}(jQuery));
