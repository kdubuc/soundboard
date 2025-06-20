$( document ).ready(function() {

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
                    ${data_key ? "<kbd class=\"btnTitle\">"+data_key+"</kbd><br>" : ""}
                    ${title}
                    ${looped === true || interupt === true ? '<br>' : ''}
                    ${looped === true ? '<span class="badge text-bg-warning"">looped</span>' : ''}
                    ${interupt === true ? '<span class="badge text-bg-warning"">interupt</span>' : ''}
                    <br>
                    <audio data-id="${elementId}" id="player" preload="auto" src="${sound}" ${looped === true ? 'loop' : ''}></audio>
                    <progress id="seekbar${elementId}" value="0" max="1"></progress>
                </button>`;
    }

    // Setup theme for the soundboard
    function setupTheme(config) {
        const name = config['_name'] || 'default name';
        const description = config['_description'] || 'default description';

        $('#title').text(name);
        $('#subtitle').text(description);

        document.title = name + ' - Soundboard HTML';
    }

    // Build the soundboard buttons dynamically
    function buildSoundboard(config) {
        const soundboardContainer = document.getElementById('soundboard');
        soundboardContainer.innerHTML = ''; // Clear existing content

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
        }
    }

    /**
     * -- Soundboard routines --
     */

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

        // Build the soundboard on page load
        setupTheme(soundboard);
        buildSoundboard(soundboard);

        // Handle keydown events to play sounds
        document.querySelectorAll('.key').forEach(key => key.addEventListener('click', function (event) {
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
            currentPlayer.play();

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
                        // var fadePoint = playingAudio.duration - 2; // 2 second fade out.
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

        // Handle when a key is pressed
        window.addEventListener('keydown', function (event) {
            // Standardize the key to uppercase
            const keyLetter = event.key.toUpperCase();

            // Check if the keyCode is in the soundboard
            const key = document.querySelector(`.key[data-key="${keyLetter}"]`);
            if( !key ) return;

            // Trigger the click event on the key to play the sound
            key.click(); 
        });

        // Display a toast notification
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(document.getElementById('liveToast'));
        toastBootstrap.show();
    });
});
