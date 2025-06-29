$( document ).ready(async function() {

    /**
     * -- Helpers functions --
     */

    // Generate a unique ID
    function generateUniqueId(prefix = 'id') {
        return prefix + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Helper to build the sound buttons dynamically
    function buildSoundButtonCode(title, data_key, sound, looped, interupt) {
        const elementId = generateUniqueId('key');
        return `<button type="button" class="btn btn-secondary key m-1" data-id="${elementId}" data-key="${data_key}" ${interupt === true ? 'interupt' : ''}>
                    ${data_key ? "<kbd class=\"btnTitle fs-5\">"+data_key+"</kbd><br>" : ""}
                    ${title}
                    ${looped === true || interupt === true ? '<br>' : ''}
                    ${looped === true ? '<span class="badge text-bg-warning"">looped</span>' : ''}
                    ${interupt === true ? '<span class="badge text-bg-warning"">interupt</span>' : ''}
                    <br>
                    <audio data-id="${elementId}" preload="auto" src="${sound}" ${looped === true ? 'loop' : ''}></audio>
                    <progress id="seekbar${elementId}" value="0" max="1"></progress>
                </button>`;
    }

    // Trigger the toast notification
    function triggerToastNotification(title, contents) {
        $('#title').text(title);
        $('#subtitle').text(contents);

        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(document.getElementById('liveToast'));
        toastBootstrap.show();
    }

    // Make the soundboard active
    function makeSoundboardActive(id) {
        // Remove the active class from all tabs
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove the active class from all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Add the active class to the selected tab
        const activeTab = document.querySelector(`.nav-link[data-bs-target="#${id}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Add the active class to the selected tab pane
        const activePane = document.querySelector(`#${id}`);
        if (activePane) {
            activePane.classList.add('active');
        }
    };

    // Build the soundboard and set up event listeners
    function buildSoundboard(config) {
        const soundboardId = generateUniqueId('soundboard');
        const name = config['_name'] || 'default name';

        // Add a tab button for the soundboard
        const soundboardTab = document.createElement('li');
        soundboardTab.classList.add('nav-item');
        soundboardTab.setAttribute('role', 'presentation');
        const soundboardButton = document.createElement('button');
        soundboardButton.classList.add('nav-link');
        soundboardButton.setAttribute('data-bs-toggle', 'tab');
        soundboardButton.setAttribute('data-bs-target', '#' + soundboardId);
        soundboardButton.setAttribute('type', 'button');
        soundboardButton.setAttribute('role', 'tab');
        soundboardButton.textContent = name;
        document.querySelector('#tabs').appendChild(soundboardTab);
        soundboardTab.appendChild(soundboardButton);

        // Create the soundboard container
        const soundboardContainer = document.createElement('div');
        soundboardContainer.classList.add('tab-pane');
        soundboardContainer.setAttribute('role', 'tabpanel');
        soundboardContainer.setAttribute('tabindex', '0');
        soundboardContainer.setAttribute('id', soundboardId);

        // Add a close button to the soundboard tab
        const closeButton = document.createElement('button');
        closeButton.classList.add('btn-close');
        closeButton.setAttribute('aria-label', 'Close');
        soundboardButton.appendChild(closeButton);
        closeButton.addEventListener('click', function() {
            soundboardTab.remove();
            soundboardContainer.remove();

            // remove the soundboard from local storage
            let soundboardConfigurations = [];
            if (localStorage.getItem('soundboardConfigurations')) {
                soundboardConfigurations = JSON.parse(localStorage.getItem('soundboardConfigurations'));
            }
            soundboardConfigurations = soundboardConfigurations.filter(sb => sb['_name'] !== name);
            localStorage.setItem('soundboardConfigurations', JSON.stringify(soundboardConfigurations));
        });

        for (const [key, sounds] of Object.entries(config)) {
            // if key begins with an underscore, skip it
            if (key.startsWith('_')) continue;

            // Create a card for each section
            const card = document.createElement('div');
            card.classList.add('card');
            card.classList.add('mb-2');
            card.classList.add('text-bg-dark');

            // Create a header for the card
            const header = document.createElement('div');
            header.classList.add('card-header');
            header.innerHTML = `${key.replace('_', ' ')}`;
            card.appendChild(header);

            // Create a card body for the sound buttons
            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('card-body');
            card.appendChild(buttonsContainer);

            sounds.forEach(sound => {
                buttonsContainer.innerHTML += buildSoundButtonCode(sound.title, sound.data_key, sound.sound, sound.looped || false, sound.interupt || false);
            });

            soundboardContainer.appendChild(card);
            document.querySelector('#soundboard').appendChild(soundboardContainer);
        }

        // make soundboard active (and hide others)
        makeSoundboardActive(soundboardId);

        // Handle keydown events to play sounds
        document.querySelectorAll(`#${soundboardId} .key`).forEach(key => key.addEventListener('click', async function (event) {
            // Ensure the element has a data-id
            const elementId = event.currentTarget.getAttribute('data-id');
            if (!elementId) return;

            // Check if the keyCode is in the soundboard
            const key = document.querySelector(`.key[data-id="${elementId}"]`);
            if( !key ) return;

            // Get the audio HTML element associated with the key
            const currentPlayer = key.querySelector('audio');
            if (!currentPlayer) return;

            // If playing, stop any currently playing sound
            if(key.classList.contains('playing')) {
                currentPlayer.pause();
                currentPlayer.currentTime = 0;
                key.classList.remove('playing');
                return;
            }

            // If not playing, add the playing flag
            key.classList.add('playing');

            // Reset the audio to the start and play it
            currentPlayer.currentTime = 0;
            await currentPlayer.play();

            // Progress bar routine (event listener)
            currentPlayer.addEventListener('timeupdate', function (event) {
                const audio = event.target;
                $('#seekbar' + audio.getAttribute('data-id')).attr("value", ((this.currentTime / this.duration)).toFixed(20));
            });

            // Behavior when the audio ends (event listener)
            currentPlayer.addEventListener('ended', function (event) {
                const audio = event.target;
                document.querySelector(`.key[data-id="${audio.getAttribute('data-id')}"]`).classList.remove('playing');
                audio.pause();
                audio.currentTime = 0;
                $('#seekbar' + audio.getAttribute('data-id')).attr("value", 0);
            });

            // If interupt is true, pause all other sounds with a fade out effect
            if (key.getAttribute('interupt') !== null) {
                document.querySelectorAll('.key.playing').forEach(playingKey => {
                    if (playingKey !== key) {
                        const playingAudio = playingKey.querySelector('audio');
                        $(playingAudio).animate({volume: 0}, 500, 'linear', function() {
                            playingAudio.pause();
                            playingAudio.currentTime = 0;
                            playingKey.classList.remove('playing');
                            playingAudio.volume = 1; // Reset volume for next play
                        });
                    }
                });
            }
        }));

        // Manage the WebSocket feature
        if (config['_websocket_url']) {
            // Create a new WebSocket connection
            const ws = new WebSocket(config['_websocket_url']);

            // Send pong frame to the WebSocket server every 20 seconds
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 20000);

            // Handle incoming messages from the WebSocket
            ws.onmessage = function(event) {
                try {
                    // Parse the incoming message
                    const message = JSON.parse(event.data);
                    // Check if the message has a keyCode
                    if (message.keyCode) {
                        // Find the key with the matching data_key
                        const key = document.querySelector(`.key[data-key="${message.keyCode.toUpperCase()}"]`);
                        if (key) {
                            // Trigger the click event on the key to play the sound
                            key.click();
                        } else {
                            console.warn(`No key found for keyCode: ${message.keyCode}`);
                        }
                    } else {
                        console.warn('Received message does not contain keyCode :', message);
                    }
                }
                catch (error) {
                    console.warn('Received message is not a correct JSON :', message);
                    return;
                }
            };
        }

        // Display a toast notification
        triggerToastNotification(config['_name'] || 'default name', config['_description'] || 'default description');
    }

    // Load soundboard configurations from local storage
    async function loadSoundboardConfigurations() {
        // Check if the local storage has soundboard configurations
        if (localStorage.getItem('soundboardConfigurations')) {
            // Parse the soundboard configurations from local storage
            const soundboardConfigurations = JSON.parse(localStorage.getItem('soundboardConfigurations'));
            // Iterate through each soundboard configuration
            for (const config of soundboardConfigurations) {
                // Build the soundboard with the configuration
                buildSoundboard(config);
            }
        }
    }

    /**
     * -- Soundboard routines --
     */

    await loadSoundboardConfigurations();

    // Load configurations from user JSON file
    document.querySelector('#fileItem').addEventListener('change', async function(event) {
        // Check if a file is selected, if not, 
        if (this.files.length !== 1) {
            throw new Error("Please select a file to load the soundboard configuration.");
        }

        // Read local JSON file to get the soundboard configuration
        const soundboardConfigUrl = URL.createObjectURL(this.files[0]);

        // Fetch the soundboard configuration
        const r = await fetch(soundboardConfigUrl);
        if (!r.ok) {
            throw new Error("Failed to load soundboard configuration");
        }

        // Parse the JSON response
        const soundboard = await r.json();

        // Build soundboard with the configuration contents
        buildSoundboard(soundboard);

        // Store the soundboard configuration in local storage
        let soundboardConfigurations = [];
        if (localStorage.getItem('soundboardConfigurations')) {
            soundboardConfigurations = JSON.parse(localStorage.getItem('soundboardConfigurations'));
        }
        soundboardConfigurations.push(soundboard);
        localStorage.setItem('soundboardConfigurations', JSON.stringify(soundboardConfigurations));
    });

    // Handle when a key is pressed
    window.addEventListener('keydown', function (event) {
        // Standardize the key to uppercase
        const keyLetter = event.key.toUpperCase();

        // Check if the keyCode is in the soundboard
        const key = document.querySelector(`.tab-pane.active .key[data-key="${keyLetter}"]`);
        if( !key ) return;

        // Trigger the click event on the key to play the sound
        key.click(); 
    });
});
