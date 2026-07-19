<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type { SoundboardConfig } from './types';
  import SoundButton from './SoundButton.svelte';

  interface Props {
    config : SoundboardConfig;
    active : boolean;
    onWsStatus ?: (status: string) => void;
  }

  // Props passed to the Soundboard component
  const { config, active, onWsStatus } : Props = $props();

  // Convert the sections object into an array of { key, sounds } for easier iteration in the template
  // Derived store to reactively update when config changes
  const sections = $derived(
    Object.entries(config.sections)
      .map(([key, sounds]) => ({ key, sounds }))
  );

  // Plain Map (not reactive) — used imperatively for the interrupt feature
  const playingAudios = new Map<HTMLAudioElement, () => void>();

  // Gradually fade out the audio over the specified duration (in milliseconds)
  function fadeOut(audio : HTMLAudioElement, duration = 500) : Promise<void> {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const start = performance.now();
      function step(t: number) {
        let progress = Math.max(0, Math.min((t - start) / duration, 1));
        audio.volume = startVolume * (1 - progress);
        progress < 1 ? requestAnimationFrame(step) : resolve();
      }
      requestAnimationFrame(step);
    });
  }

  // Set up context for child SoundButton components to manage playing audio
  setContext('soundboard', {

    // Register a playing audio element with a cleanup function
    registerPlaying(audio: HTMLAudioElement, cleanup : () => void) : void {
      playingAudios.set(audio, cleanup);
    },

    // Unregister a playing audio element
    unregisterPlaying(audio : HTMLAudioElement) : void {
      playingAudios.delete(audio);
    },

    // Interrupt all playing audio except the specified one
    async interruptAllExcept(exceptAudio : HTMLAudioElement) : Promise<void> {
      await Promise.all(
        [...playingAudios]
          .filter(([audio]) => audio !== exceptAudio)
          .map(async ([audio, cleanup]) => {
            await fadeOut(audio);
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1;
            cleanup();
          })
      );
    },
  });

  // Set up WebSocket connection if a URL is provided in the config
  onMount(() => {
    if (!config._websocket_url) {
      return;
    };

    onWsStatus?.('connecting');
    const ws = new WebSocket(config._websocket_url);

    ws.onopen = () => onWsStatus?.('connected');
    ws.onerror = () => onWsStatus?.('error');

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      };
    }, 20000);

    ws.onmessage = (event) => {
      try {
        const { keyCode } = JSON.parse(event.data as string) as { keyCode?: string };
        if (keyCode) {
          document
            .querySelector<HTMLButtonElement>(`.key[data-key="${keyCode.toUpperCase()}"]`)
            ?.click();
        }
      } catch {
        console.warn('Invalid WebSocket message:', event.data);
      }
    };

    return () => {
      clearInterval(ping);
      ws.close();
    };
  });
</script>

<div class="tab-pane" class:active role="tabpanel" tabindex="0">
  {#each sections as { key, sounds }}
    <div class="card mb-2 text-bg-dark">
      <div class="card-header">{key.replace('_', ' ')}</div>
      <div class="card-body">
        {#each sounds as sound}
          <SoundButton config={sound} />
        {/each}
      </div>
    </div>
  {/each}
</div>
