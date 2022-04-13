/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};

var authToken;

(function rideScopeWrapper($) {
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

    let fiveLetters, hiddenWord, unused = [], lock = [], close = [];
    let match = ['_','_','_','_','_'];
    lock = ['_','_','_','_','_'];

    let result = document.getElementById('result');
    let guess = document.getElementById('guess');
    let foundYou = document.getElementById('foundYou');
    let error = document.getElementById('error');
    let tryThis = document.getElementById('tryThis');

    window.addEventListener("load", function () {
        // document.body.style.backgroundColor = getColorCode();

        fetch('https://raw.githubusercontent.com/gtjames/csv/master/Dictionaries/five.txt')
            .then(resp => resp.text())
            .then(words => setup(words) )
    });

    document.getElementById('search').addEventListener('click', search);
    document.getElementById('eliminate').addEventListener('click', eliminate);

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
                match[i] = 'c';
                attempt += letter;
                setActive(letter, 'c');
            }
            if (letter[0] === '!') {
                attempt += letter.charAt(1);
                setActive(letter.charAt(1), '_');
                unused.push(letter.charAt(1));
            }
        }
        findPossibles(attempt.toLowerCase(), unused, lock, match);

        let td ='';
        for (let h = 0; h < 5; h++) {
            td += `<td class="${match[h]}">${attempt[h]}</td>`
        }
        create(match, attempt);
        result.innerHTML += `<tr>${td}</tr>`;
    }

    function create(match, attempt) {
        let move = '';
        for(let i = 0; i < 5; i++) {
            move += match[i] + attempt[i];
        }
        fetch(_config.api.invokeUrl, {
            method: 'POST',
            headers: { Authorization: authToken },
            body: JSON.stringify({ move: move+'A', userName: 'gtjames', gameKey: '3dhw4r7hda0' }),
            data: JSON.stringify({ move: move+"Z", userName: 'TariJames', gameKey: 'SecretSquirrel' }),
            contentType: 'application/json',
        })
            .then(resp => resp.json())
            .then((result) => completeRequest(result))
            .catch(err => console.log('Fetch Error :', err) );
    }

    function completeRequest(result) {
        console.log('Response received from API: ', result);
        displayUpdate(`your move ${result}`);
    }

    function setup(words) {
        fiveLetters = words.split('\n');
        hiddenWord = select();
        foundYou.innerHTML = `${hiddenWord}<br>`;
    }

    function select() {
        let index = Math.floor(Math.random() * fiveLetters.length);
        return fiveLetters[index];
    }

    function search() {
        let attempt = guess.value;
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

        findPossibles(attempt, unused, lock, match);

        let td ='';
        for (let h = 0; h < 5; h++) {
            td += `<td class="${match[h]}">${attempt[h]}</td>`
        }
        result.innerHTML += `<tr>${td}</tr>`;
        // document.body.style.backgroundColor = getColorCode();
    }

    function findPossibles(attempt, unused, lock, match) {
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


}(jQuery));
