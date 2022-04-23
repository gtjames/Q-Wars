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

		/**
		 * 		read the list of five letter words
		 */
		fetch('https://raw.githubusercontent.com/gtjames/csv/master/Dictionaries/five.txt')
			.then(resp => resp.text())
			.then(words => {
				fiveLetters = words.split('\n');
				initializeGame()
			});
	});

	/**
	 * 		declare all game variables
	 *
	 * 		get references to all important page elements
	 */

	let fiveLetters, hiddenWord, unused, close, lock, guess;

	let gameKey;
	let userName = localStorage.getItem("userName");
	let timerId = -1;

	let userAttempts 	= document.getElementById('userAttempts');
	let secretWord 		= document.getElementById('secretWord');
	let possibleWords 	= document.getElementById('possibleWords');
	let error 			= document.getElementById('error');
	let tryThis 		= document.getElementById('tryThis');
	let progress 		= document.getElementById('progress');
	let competition 	= document.getElementById('competition');

	document.getElementById("userName").value = userName;

	/**
	 * 		add event listeners for keystroke and search events
	 */
	document.getElementById('newUser').addEventListener('click', newUser);
	document.getElementById('eliminate').addEventListener('click', search);
	window.addEventListener('keydown', readKey);

	/**
	 * 		initializeGame
	 * 			set up all game variables
	 * 			and select the next hidden word
	 */
	function initializeGame() {
		hiddenWord 	= selectRandomWord();
		guess 		= '';
		unused 		= new Set();
		lock  		= ['_','_','_','_','_'];
		close 		= [new Set(),new Set(),new Set(),new Set(),new Set()];

		secretWord.innerHTML 	= `${hiddenWord}`;
		userAttempts.innerHTML 	= ``;
		progress.innerHTML 		= '';
		possibleWords.innerHTML = '';
		tryThis.innerHTML 		= '';
		const allKeys = document.querySelectorAll("div.row > button");
		allKeys.forEach(key => key.className = '');
		const guesses = document.querySelectorAll(".class");
		guesses.forEach(key => key.innerText = '');
	}

	/**
	 * 		readKey
	 * 			listen for any user keystrokes
	 * 			CR	search work matching letters
	 * 			BS	removev the last character
	 * 			A-Z	add to the guessed work
	 * 		@param e		key event object
	 */
	function readKey(e) {
		error.innerText = '';
		if (e.keyCode === 13) {
			if (guess.length !== 5) {
				error.innerText = `${guess}: doesn't have 5 characters`;
			} else {
				//	check to see if the guessed word is a word
				if ( fiveLetters.find(w => w === guess) !== guess) {
					error.innerText = `${guess}: is not a valid word`;
				} else {
					search();
				}
			}
		} else if (e.keyCode === 8) {
			guess = guess.substr(0, guess.length - 1);
			document.getElementById(guess.length + "").innerText = '';
		} else if ( e.keyCode >= 65 && e.keyCode <= 90 && guess.length < 5 ) {
			let letter = String.fromCharCode(e.keyCode);
			document.getElementById(guess.length + "").innerText = letter;
			guess += letter;
		}
	}

	function newUser() {
		userName = document.getElementById("userName").value;
		gameKey = document.getElementById("gameKey").value;
		createGame(userName, gameKey);
		if (timerId !== -1)
			clearTimeout(timerId);

		timerId = setInterval(()=>{ getOtherMoves() }, 5000);
	}

	/**
	 * 		search
	 * 			It's show time!
	 * 			get the guessed word and check of found, matches or close
	 */
	function search() {
		let match = ['_','_','_','_','_'];

		//	did we guess the word?
		if (guess === hiddenWord) {
			initializeGame()
			return;
		}

		for (let g = 0; g < 5; g++) {
			let found = false;
			for (let h = 0; h < 5; h++) {
				if (hiddenWord[h] === guess[g]) {
					found = true;
					if (match[g] === 'e') continue;
					match[g] = (h === g) ? 'e' : 'c';
					setActive(guess[g], match[g]);
					if (match[g] === 'e') lock[g] = guess[g];
					if (match[g] === 'c' && hiddenWord[g] !== guess[g]) close[g].add(guess[g]);
				}
			}
			if (!found) {
				setActive(guess[g], '_');
				unused.add(guess[g]);
			}
		}
		let stats ='Un ' + [...unused].join('') + ' -> ' + Array.from(close[0])
			+ '_' + Array.from(close[1]) + '_' + Array.from(close[2])
			+ '_' + Array.from(close[3]) + '_' + Array.from(close[4])
			+ ' -> ' + lock;

		//	let's see what words match our hits and misses so far
		findPossibles(lock);
		userAttempts.innerHTML += postAttempt(match, guess, stats)
		makeAMove(match, guess);
		for (let i = 0; i < 5; i++) {
			document.getElementById(i + "").innerText = '';
		}
		guess = '';
	}

	/**
	 * 		postAttempt
	 * 			Add this attempt to the list of guessed words
	 * @param match
	 * @param stats
	 * @returns {string}
	 */
	function postAttempt(match, userGuess, stats) {
		let button ='';
		for (let h = 0; h < 5; h++) {
			button += `<button class="${match[h]}">${userGuess[h]}</button>`;
		}

		//		<p class='stats'>${stats}</p></div>
		return `<div class="row">${button}`;
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
						card += postAttempt(match, filler, '');
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

	/**
	 * 		selectRandomWord
	 * @returns {*}
	 */
	function selectRandomWord() {
		return fiveLetters[Math.floor(Math.random() * fiveLetters.length)];
	}

	/**
	 * 		findPossibles
	 * 			this is the real money function here
	 * 			identify all works that could be the hiddend word
	 * 			find all words with exactly matching letter and position
	 * 			find all words with a necessary letter but NOT in the position we typed it in to
	 * 			skip app words that havev any letters
	 * @param lock
	 * @returns {*}
	 */
	function findPossibles(lock) {
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
				if ((lock[i] !== '_' && lock[i] !== w.charAt(i)))
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

	/**
	 * 		setActive
	 * 			Set the status of the keyboard element to match what we have learned about the key pressed
	 * @param letter
	 * @param status
	 */
	function setActive(letter, status) {
		// use querySelectorAll to get all of the type li elements
		const allTypes = document.querySelectorAll("div.row > button");
		allTypes.forEach((item) => {
			// check to see if this is the one to make active
			if (item.dataset.key === letter) {
				if ( item.className !== 'e')		//	do not demote a key
					item.className = status;
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
