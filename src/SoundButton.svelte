<script lang="ts">
  import { getContext } from 'svelte';
  import type { SoundConfig } from './types';

  const { config } : { config: SoundConfig } = $props();

  const soundboard = getContext<{
    registerPlaying : (audio: HTMLAudioElement, cleanup: () => void) => void;
    unregisterPlaying : (audio: HTMLAudioElement) => void;
    interruptAllExcept : (audio: HTMLAudioElement) => Promise<void>;
  }>('soundboard');

  let audio: HTMLAudioElement;
  let playing = $state(false);
  let progress = $state(0);

  // Stop playing and reset state
  function stop() {
    playing = false;
    progress = 0;
    soundboard.unregisterPlaying(audio);
  }

  // Toggle play/pause for the sound
  async function toggle() {
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      stop();
      return;
    }

    if (config.interrupt === true) {
      await soundboard.interruptAllExcept(audio);
    }

    playing = true;
    soundboard.registerPlaying(audio, stop);
    audio.currentTime = 0;

    try {
      await audio.play();
    } catch {
      stop();
    }
  }

  // Update progress bar as the audio plays
  function onTimeUpdate() {
    if (audio.duration > 0) {
      progress = audio.currentTime / audio.duration
    }
  }

  // Handle audio ended event
  function onEnded() {
    stop();
  }
</script>

<style>
  .btn.key {
    width: 175px;
    height: 100px;
    border-radius: 10px;
    background-color: #333;
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s ease, transform 0.1s ease;
  }

  .btn.key:hover {
    background-color: #444;
  }

  .btn.key.playing {
    background-color: #555;
    border: 1px solid #007dc7;
  }
</style>

<button
  type="button"
  class="btn btn-secondary key m-1"
  class:playing
  data-key={config.data_key}
  onclick={toggle}
>

  {#if config.data_key}
    <kbd class="btnTitle fs-4">{config.data_key}</kbd><br />
  {/if}

  {config.title}

  {#if config.looped === true || config.interrupt === true}
    <br />
    {#if config.looped === true}<span class="badge text-bg-warning">looped</span>{/if}
    {#if config.interrupt === true}<span class="badge text-bg-warning">interrupt</span>{/if}
  {/if}

  <br />

  <audio
    bind:this={audio}
    src={config.sound}
    preload="auto"
    loop={config.looped}
    ontimeupdate={onTimeUpdate}
    onended={onEnded}
  ></audio>

  <progress value={progress} max="1"></progress>
  
</button>
