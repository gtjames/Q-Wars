/*global WildRydes _config*/

(function rideScopeWrapper($) {
	let WildRydes = window.WildRydes || {};

	let authToken;

	WildRydes.authToken.then(function setAuthToken(token) {
		if (token) {
			authToken = token;
		} else {
			window.location.href = '/signin.html';
		}
	}).catch(function handleTokenError(error) {
		alert(error);
		window.location.href = '/signin.html';
	});

	// Register click handler for #request button
	$(function onDocReady() {
		WildRydes.authToken.then(function updateAuthMessage(token) {
			if (token) {
				displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
				$('.authToken').text(token);
			}
		});

		if (!_config.api.invokeUrl) {
			$('#noApiMessage').show();
		}
	});

	function displayUpdate(text) {
		$('#updates').append($('<li>' + text + '</li>'));
	}

	window.addEventListener('keydown', readKey);
	let guess = '';

	function readKey(e) {
		if (guess.length === 5)
			return;

		const keyPressed = document.querySelector(`[data-key="${e.keyCode.toLowerCase()}"]`);
//		if (!keyPressed) return;

		document.getElementById(guess.length+"").value = e.keyCode;
		guess += e.keyCode;
	}

	// let allKeys = document.querySelectorAll(`[data-key]`);
	// link.dataset.key
	// link.getAttribute('data-key');

	let fiveLetters, hiddenWord, unused = [], close = [];
	let match = ['_','_','_','_','_'];
	let lock  = ['_','_','_','_','_'];
	let userName = localStorage.getItem("userName");
	document.getElementById("userName").value = userName;
	let gameKey;

	let competition = document.getElementById('competition');
	let userAttempts = document.getElementById('userAttempts');
	let foundYou = document.getElementById('foundYou');
	let error = document.getElementById('error');
	let tryThis = document.getElementById('tryThis');

	window.addEventListener("load", function () {
		// document.body.style.backgroundColor = getColorCode();

		fetch('https://raw.githubusercontent.com/gtjames/csv/master/Dictionaries/five.txt')
			.then(resp => resp.text())
			.then(words => initializeGame(words) )
	});

	document.getElementById('newUser').addEventListener('click', newUser);
	document.getElementById('eliminate').addEventListener('click', search);

	function newUser() {
		userName = document.getElementById("userName").value;
		gameKey = document.getElementById("gameKey").value;
		createGame(userName, gameKey)
	}

	function search() {
		let match = ['_','_','_','_','_'];
		let attempt = '';

		for (let i = 0; i < 5; i++) {
			attempt += document.getElementById(i+"").value;
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
					if (match[g] === 'e') break;
					match[g] = (h === g) ? 'e' : 'c';
					setActive(attempt[g], match[g]);
					if (match[g] === 'e') lock[g] = attempt[g];
					if (match[g] === 'c') close.push(attempt[g]);
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

	}

	function postAttempt(match, attempt) {
		let td ='';
		for (let h = 0; h < 5; h++) {
			td += `<td class="${match[h]}">${attempt[h]}</td>`
		}
		return `<tr>${td}</tr>`;
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

	//let timerId =
	setInterval(()=>{ getOtherMoves() }, 5000);

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
		// displayUpdate(`your move ${JSON.stringify(result)}`);
	}

	function initializeGame(words) {
		fiveLetters = words.split('\n');
		hiddenWord = selectRandomWord();
		foundYou.innerHTML = `${hiddenWord}<br>`;
	}

	function selectRandomWord() {
		let index = Math.floor(Math.random() * fiveLetters.length);
		return fiveLetters[index];
	}

	function findPossibles(unused, lock, match) {

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
		possibles = possibles.filter(w => {
			for (let c of close) {
				if (w.indexOf(c) === -1)
					return false;           //  does not contain a close letter
			}
			return true;                    //  contains all close letters
		});

		let text = '';
		for (let w of possibles) {
			text += `<li>${w}</li>`;
		}
		tryThis.innerHTML = text;
		foundYou.innerHTML += `Possibles ${possibles.length}<br>`;
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

	/*
	function eliminate() {
		let letter, attempt = '';
		for (let i = 0; i < 5; i++) {
			letter = document.getElementById(i+"").value;
			if ( letter >= 'A' && letter <= 'Z') {
				lock[i] = letter.toLowerCase();
				match[i] = 'e';
				setActive(letter.toLowerCase(), 'e');
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
		findPossibles(attempt.toLowerCase(), unused, lock, match);
		userAttempts.innerHTML += postAttempt(match, attempt)
		makeAMove(match, attempt);
	}
	 */

}(jQuery));
