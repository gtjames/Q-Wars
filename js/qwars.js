/*global WildRydes _config*/

(function rideScopeWrapper($) {
	let WildRydes = window.WildRydes || {};

	let authToken;

	WildRydes.authToken.then(function setAuthToken(token) {
		if (token) 	{
			authToken = token;
			console.log(`You are authenticated. Your token is: ${token}`);
		}
		else {
		//	window.location.href = '/signin.html';
		}
	}).catch(error => console.log(JSON.stringify(error)));	// window.location.href = '/signin.html');

	/**
	 * 		declare all game variables
	 *
	 * 		get references to all important page elements
	 */

	let fullList, hiddenWord, unused, close, lock, guess, width, gameOver;
	let apiGateway = 'https://slcrbpag33.execute-api.us-west-1.amazonaws.com/prod';

	let gameKey = 'gameA';
	let userName 		= localStorage.getItem('userName');
	let timerId = -1;
	let numOfTries = 0;
	let wordl;			//	is the chosen word file for wordl words

	let userAttempts 	= document.getElementById('userAttempts');
	let error 			= document.getElementById('error');
	let tryThis 		= document.getElementById('tryThis');
	let competition 	= document.getElementById('competition');
	let selectWidth 	= document.getElementById('selectWidth');
	let letters 		= document.getElementById('letters');
	let newWidth 		= document.getElementById('newWidth');
	// let myModal 		= document.getElementById('myModal');

	let keyBoard 		= document.querySelectorAll('#keyboard button')
	keyBoard.forEach(key => key.addEventListener('touch',	readKeyboard));
	keyBoard.forEach(key => key.addEventListener('click',	readKeyboard));
	window.addEventListener						('keydown',	readKeypress);
	userAttempts.addEventListener				('click', 	showGuesses);

	/**
	 * 		add event listeners for keystroke and search events
	 */
	document.getElementById('playAgain').addEventListener('click', initializeGame);
	document.getElementById('reveal').addEventListener('click', reveal);
	document.getElementById('verifyChallenge').addEventListener('click', sendChallenge);
	document.getElementById('gameKey').addEventListener('change', newGame)
	document.getElementById('myChallenge').addEventListener('click', () =>$("#myModal").modal());
	// $(document).ready(() => $("#sendChallenge").click(() => $("#myModal").modal()));
	selectWidth.addEventListener('change', loadWords);
	newWidth.addEventListener('click', (e) => selectWidth.style.visibility = '');

	function loadWords(e) {
		/**
		 * 		read the list of five-letter words
		 */
		console.log(e.target.value);
		readWordFile(e.target.value);				//	force width to be a number.
		selectWidth.setAttribute("disabled", "true");
		// document.getElementById('customMessageTextArea').removeAttribute("disabled");
		// document.getElementById('customMessageTextArea').focus();
	}

	function readWordFile(wordSize) {
		width = (wordSize === 'w' || wordSize === "0") ? 5 : +wordSize;

		let text = '';
		for (let l = 0; l < width; l++) {
			text += `<td><button id='${l}' class='guess oneLetter'></button></td>`;
		}
		letters.innerHTML = text;
		document.getElementById('0').addEventListener('click', showStats);

		wordl = wordSize === 'w' || wordSize === "0";
		wordSize = (wordSize === 'w' || wordSize === "0") ? 'w' : wordSize;
		fetch(`https://raw.githubusercontent.com/gtjames/csv/master/Dictionaries/${wordSize}Letters.txt`)
		.then(resp => resp.text())
		.then(words => {
			fullList = words.split('\n');
			if (document.querySelector("#user").value.length == 5) {
				hiddenWord = document.querySelector("#user").value;
				genericInit();
			} else {
				initializeGame();
			}
		});
	}

	function validateEmail(email) {
		return email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/);
		// return email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);
	}

	/**
	 * 		initializeGame
	 * 			set up all game variables
	 * 			and select the next hidden word
	 */
	function initializeGame() {
		userName = 'jamesga@byui.edu';
		gameKey = 'gameA1';  
		let x = document.getElementById('0').innerText;
		if(x === 'A')  createGame(gameKey);
		if(x === 'B')  myActiveGames();				//	load my active games
		if(x === 'C')  sendInvites([userName, 'gary.james@unt.edu','gtjames@gmail.com'], gameKey)
		if(x === 'D')  getOtherMoves();
		if(x === 'E')  makeAMove(['_','_','_','_','_'],['S','M','A','R','T']);

		hiddenWord 	= selectRandomWord();
		genericInit();
	}

	function genericInit() {
		guess 		= '';
		unused 		= new Set();
		lock  		= '_'.repeat(width).split('');
		close 		= [];
		numOfTries	= 0;
		gameOver	= false;

		for (let i = 0; i < width; i++) {
			close.push(new Set());
		}

		error.innerText 		= '';
		userAttempts.innerHTML 	= '';
		tryThis.innerHTML 		= '';
		const allKeys = document.querySelectorAll('div.row > button');
		allKeys.forEach(key => key.className = '');
		const guesses = document.querySelectorAll('.guess');
		guesses.forEach(spot => spot.innerText = '');
		guesses.forEach(spot => spot.classList.remove('round'));
		$('#updates').empty();
		['1','2','3','4','5','6','7','8','9'].forEach(n => localStorage.removeItem(n))
	}

	function reveal() {
		let secretWord		 = document.getElementById('secretWord');
		secretWord.innerText = (secretWord.innerText.length === 0) ? hiddenWord : '';
	}

	/**
	 * 		readKey
	 * 			listen for any user keystrokes
	 * 			CR	search work matching letters
	 * 			BS	remove the last character
	 * 			A-Z	add to the guessed work
	 * 		@param e		key event object
	 */
	function readKeyboard(e) {
		keyEvent( e.target.dataset.key );
	}

	function readKeypress(e) {
		let key;
		if 			(e.keyCode === 8 )	key = 'BS';
		else if 	(e.keyCode === 13)	key = 'CR';
		else  							key = String.fromCharCode(e.keyCode);
		keyEvent(key);
	}

	function keyEvent(key) {
		error.innerText = '';
		const input = document.querySelectorAll('.guess');
		input.forEach(spot => spot.classList.remove('nope'));
		if (key === 'CR') {
			if (guess.length !== width) {
				error.innerText = `${guess}: doesn't have ${width} characters`;
			} else if ( fullList.find(w => w === guess) !== guess) {
				error.innerText = `${guess}: is not a valid word`;
				input.forEach(spot => spot.classList.add('nope'));
			} else if (gameOver) {
				error.innerText = `Game Over`;
			} else {
				search();
			}
		} else if (key === 'BS') {
			if ( guess.length > 0) {
			guess = guess.substr(0, guess.length - 1);
			document.getElementById(guess.length + '').innerText = '';
			document.getElementById(guess.length + '').classList.toggle('round');
			}
		} else if ( key >= 'A' && key <= 'Z' ) {
			if (guess.length < width ) {
				document.getElementById(guess.length + '').innerText = key;
				document.getElementById(guess.length + '').classList.toggle('round');
				guess += key;
				if (guess.length === width &&	 fullList.find(w => w === guess) !== guess) {
					error.innerText = `${guess}: is not a valid word`;
					input.forEach(spot => spot.classList.add('nope'));
				}
			}
		}
	}

	/**
	 * 	newGame
	 * 		the user selected an active game from the gameKey dropdown list
	 * 			we will use this game key to periodically request
	 * 			what the moves look like for our other players
	 *
	 * 		called when the list of active games is updated
	 */
	function newGame() {
		let newGameKey = document.getElementById('gameKey').value;
		newGameKey = (newGameKey.length === 0) ? 'GameZ' : newGameKey.split('-')[0];

		createGame(newGameKey);
		if (timerId !== -1)
			clearTimeout(timerId);

		timerId = setInterval(()=>{ getOtherMoves() }, 6000);
	}

	/**
	 * 		search
	 * 			It's show time!
	 * 			get the guessed word and check if found, matches or close
	 */
	function search() {
		let match = '_'.repeat(guess.length).split('');

		numOfTries++;

		//	did we guess the word?
		if (guess === hiddenWord) {
			error.innerText = `You did it! You guessed: ${guess} in ${numOfTries} tries`;
			userAttempts.innerHTML += postAttempt('x'.repeat(guess.length), guess, 1)
			makeAMove('x'.repeat(guess.length), guess);
			gameOver = true
			return;
		}

		for (let g = 0; g < width; g++) {
			let found = false;
			for (let h = 0; h < width; h++) {
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

		//	let's see what words match our hits and misses so far
		let howMany = findPossibles(lock);
		userAttempts.innerHTML += postAttempt(match, guess, howMany);
		makeAMove(match, guess);
		const guesses = document.querySelectorAll('.guess');
		guesses.forEach(spot => spot.innerText = '');
		guesses.forEach(spot => spot.classList.remove('round'));
		guess = '';
	}

	function showStats() {
		let stats;
		stats  = '(un) ' + [...unused];
		stats += '<br>(cl) ' + close.map(c => (c.size>0) ? Array.from(c):'_').join('|')
		stats += '<br>(lk) ' + lock.join('|');
		error.innerHTML = stats;
	}

	function showGuesses(e) {
		let row = e.target.id.substring(5);
		if (row === null)		return;
		displayUpdate(localStorage.getItem(row));
		console.log(JSON.parse(localStorage.getItem(row)));
	}
	/**
	 * 		postAttempt
	 * 			Add this attempt to the list of guessed words
	 * @param match			_ - not found, e found at this position, c - found in the word but not here
	 * @param userGuess		the word typed by the user
	 * @param howMany		show the number of possible guesses
	 * @returns {string}	string with the formatted word of hits and misses
	 */
	function postAttempt(match, userGuess, howMany) {
		let button ='';
		for (let h = 0; h < width; h++) {
			button += `<button class='${match[h]} oneLetter'>${userGuess[h]}</button>`;
		}
		return `<div class='row'>${button}<button id='guess${numOfTries}' class='x margin'>${howMany}</button></div>`;
	}

	/**
	 * 		createGame
	 * 			get all players in this game with their moves to date
	 * @param gameKey
	 */
	function createGame(gameKey) {
		fetch(apiGateway, {
			method: 'POST',
			headers: { Authorization: authToken },
			body: JSON.stringify({ 'userName' : userName, 'gameKey' : gameKey})
		})
			.then(resp => resp.json())
			.then(data => {
				console.log(JSON.stringify(data));
				document.getElementById('myMoves').innerText = userName;
			})
			.catch(err => console.log('Fetch Error :', err) );
	}

	/**
	 * 		sendChallenge
	 * 			define a game name and send invites to a list of friends
	 * 			then you can watch how they progress through solving the word
	 *
	 * 		called when the create game modal is dismissed
	 */
	function sendChallenge() {
		let error 			= document.getElementById('gameError');
		let challengeKey 	= document.getElementById('challengeKey');
		let friends 		= document.getElementById('friends');

		let gameKey 	= challengeKey.value;
		let friendList 	= friends.value;

		if (gameKey.length === 0) {
			error.innerHTML = `Please enter Game Name`;
			return;
		}
		let friendEmails = friendList.split(/(?:,| |\n)+/);
		friendEmails = friendEmails.filter(f => f.length > 0);
		let bad = friendEmails.filter(email => ! validateEmail(email));
		if (bad.length > 0) {
			error.innerHTML = `Please correct the poorly formed email addresses: ${bad.join(',')}`;
		} else {
			sendInvites(friendEmails, gameKey)
			error.innerHTML = `Invites have been sent: ${friendEmails.join(',')}`;
			// Set a timeout to hide the element again
			setTimeout(() => {
				friends.value = '';
				error.innerHTML = '';
				challengeKey.value = '';

				$('#myModal').modal('toggle')
			}, 6000);
		}
	}

	function sendInvites(friendEmails, gameKey) {
		let newWord = selectRandomWord();
		let body = { 'email' : friendEmails, 'gameKey' : gameKey, 'word': newWord };
		fetch(apiGateway + '/invite', {
			method: 'POST',
			headers: { Authorization: authToken },
			body: JSON.stringify(body)
		})
			.then(resp => resp.json())
			.then(data => data => {
				document.getElementById('myMoves').innerText = data.userName;
			})
			.catch(err => console.log('Fetch Error :', err) );
	}

	function getOtherMoves() {
		fetch(`https://slcrbpag33.execute-api.us-west-1.amazonaws.com/prod?userName=${userName}`)
			.then(resp => resp.json())
			.then(games => {
				games = games.data;
				let allPlayers = games.filter(p => p.userName !== userName && p.moves.length > 0);
				competition.innerHTML = '';
				allPlayers.forEach(player => {
					let card = `<div class='w3-col m4 l3 disney-card w3-theme-d1'>
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

	/**
	 * 		myActiveGames
	 * 			which games am I currently working on?
	 * 			this data will populate the dropdown list
	 *
	 * 		called at page load
	 */
	function myActiveGames() {
		//       fetch(apiGateway, {
		fetch(_config.api.invokeUrl+'/myGames', {
			method: 'POST',
			headers: { Authorization: authToken },
			body: JSON.stringify({ userName : userName, gameKey: gameKey }),
			contentType: 'application/json',
		}, true)
			// .then(resp => resp.json())
			.then(resp => resp.text())
			.then(result => {
				completeRequest(result);
				console.log(_config.api.invokeUrl+`/myGames/?userName=${userName}`);
				console.log(userName + ': anything? -> ' + result);
				if (result.length === 0) return
				result = JSON.parse(result);
				let options = `<option value='gameA-JUMPY'>gameA</option><option value='gameB-LITTLE'>gameB</option>`;
				result.forEach(g => options += `<option value='${g.gameKey}-${g.word}'>${g.gameKey}</option>` )
				document.getElementById('gameKey').innerHTML = options;
			})
			.catch(err => console.log('Fetch Error :', err) );
	}

	function myActiveGames2(userName) {
		fetch(_config.api.invokeUrl+`/?userName=${userName}`, {
			headers: { Authorization: authToken },
			contentType: 'application/json',
		})
			.then(resp => resp.text())
			.then(result => {
				console.log(_config.api.invokeUrl+`/?userName=${userName}`);
				console.log(userName + ': anything? -> ' + result);
				if (result.length === 0) return
				result = JSON.parse(result);
				let options = `<option value='gameA-JUMPY'>gameA</option><option value='gameB-LITTLE'>gameB</option>`;
				result.forEach(g => options += `<option value='${g.gameKey}-${g.word}'>${g.gameKey}</option>` )
				document.getElementById('gameKey').innerHTML = options;
			})
			.catch(err => console.log('Fetch Error :', err) );
	}

	function makeAMove(match, attempt) {
		let move = '';
		for(let i = 0; i < width; i++) {
			move += match[i] + attempt[i];
		}
		if (1===1) return;
		//       fetch(apiGateway, {
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
		if (wordl) {
			let today = new Date();
			let date1 = new Date("10/16/2017");
			let diffDays = ((today - date1) / (1000 * 60 * 60 * 24)) | 0;
			return fullList[diffDays];
		}
		else {
			return fullList[Math.floor(Math.random() * fullList.length)];
		}
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
		let possibles = fullList;
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
			for (let i = 0; i < width; i++) {
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
		// tryThis.innerHTML = text;
		localStorage.setItem(numOfTries, JSON.stringify(possibles))
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
		const allTypes = document.querySelectorAll('div.row > button');
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
		for (let i = 0; i < width; i++) {
			letter = document.getElementById(i+'').innerText;
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
