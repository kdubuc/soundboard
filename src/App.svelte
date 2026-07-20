<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Toast } from 'bootstrap';
  import type { SoundboardConfig } from './types';
  import Soundboard from './Soundboard.svelte';
  import JSZip from 'jszip';

  // Define a constant key for storing soundboard configurations in localStorage
  const STORAGE_KEY = 'soundboardConfigurations';

  interface SoundboardEntry {
    id : string;
    config : SoundboardConfig;
  }

  // Initialize the soundboards state by loading configurations from localStorage, or start with an empty array if none are found or if parsing fails
  const soundboards = $state<SoundboardEntry[]>((() => {
    try {
      return (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SoundboardConfig[]).map(
        (config) => ({ id: crypto.randomUUID(), config })
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  })());
  
  let activeIndex = $state(0);
  let wsStatuses = $state<Record<string, string>>({});
  let toast = $state<{ title : string; subtitle : string } | null>(null);
  let toastEl: HTMLElement | undefined = $state();

  // Load a soundboard configuration from a JSON file and add it to the list of soundboards
  async function loadFile(event : Event) : Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
        return;
    };

    const url = URL.createObjectURL(input.files[0]);
    const r = await fetch(url);
    const config : SoundboardConfig = await r.json();

    addSoundboard(config);
  }

  async function loadPackage(event : Event) : Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
        return;
    };

    const zip = await JSZip.loadAsync(input.files[0]);

    const configFile = zip.file('config.json');
    if (!configFile) {
      throw new Error('config.json not found in the zip package.');
    };

    const config : SoundboardConfig = JSON.parse(await configFile.async('string'));

    // Remplacer chaque "sound" par un blob URL
    for (const sounds of Object.values(config.sections)) {
      for (const sound of sounds) {
        const zipEntry = zip.file(sound.sound);
        if (zipEntry) {
          const blob = await zipEntry.async('blob');
          sound.sound = URL.createObjectURL(blob);
        }
      }
    }

    addSoundboard(config, false); // Don't save in localStorage since the sounds are blob URLs and won't persist across sessions
  }

  // Add a new soundboard configuration to the list and persist it to localStorage
  async function addSoundboard(config : SoundboardConfig, saveInLocalStorage = true) : Promise<void> {
    soundboards.push({ id: crypto.randomUUID(), config }); // Add the new soundboard to the list
    if (saveInLocalStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(soundboards.map((sb) => sb.config))); // Persist soundboards to localStorage (without session-only IDs)
    }
    activeIndex = soundboards.length - 1; // Set the newly loaded soundboard as active

    // Show Bootstrap toast whenever a new soundboard is loaded
    toast = { title: config._name ?? 'Soundboard loaded', subtitle: config._description ?? 'A newly loaded soundboard was added.' };
    await tick(); // wait for DOM to reflect new toast content
    if (toastEl) {
      Toast.getOrCreateInstance(toastEl).show();
    }
  }

  // Load a built-in soundboard configuration by index
  function loadBuiltinConfig(index : number) : void {
    const builtinConfigs : SoundboardConfig[] = [
        // Built-in test sample configuration index 0
        {
          _name: "Test sample",
          _description: "This is a sample soundboard configuration for testing purposes.",
          sections: {
              general: [
                  { title: "Pygmy Shrew", data_key: "A", sound: "https://sound-effects-media.bbcrewind.co.uk/mp3/NHU05085149.mp3" },
                  { title: "Atmospheres Open Field", sound: "https://sound-effects-media.bbcrewind.co.uk/mp3/07028064.mp3", looped: true },
                  { title: "Heavy Explosion", sound: "https://sound-effects-media.bbcrewind.co.uk/mp3/07037326.mp3", interrupt: true }
              ]
          }
      }
    ];

    if (index >= 0 && index < builtinConfigs.length) {
      addSoundboard(builtinConfigs[index]);
      return;
    }

    throw new Error(`Builtin config index ${index} is out of range.`);
  }

  // Close a soundboard and update the active index accordingly
  function closeSoundboard(index : number) {
    const { id } = soundboards[index];
    soundboards.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(soundboards.map((sb) => sb.config)));
    delete wsStatuses[id];
    if (activeIndex >= soundboards.length) {
      activeIndex = Math.max(0, soundboards.length - 1);
    } else if (activeIndex > index) {
      activeIndex--;
    }
  }

  // Handle keyboard events to trigger sound buttons based on key presses
  onMount(() => {
    function handleKeydown(e : KeyboardEvent) : void {
      const key = document.querySelector<HTMLButtonElement>(
        `.tab-pane.active .key[data-key="${e.key.toUpperCase()}"]`
      );
      key?.click();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // Utility functions to determine WebSocket status classes and labels
  function wsStatusClass(status : string) : string {
    if (status === 'connected') {
      return 'text-bg-success'
    };
    if (status === 'error') {
      return 'text-bg-danger'
    };
    return 'text-bg-info';
  }

  // Utility function to get a human-readable label for WebSocket status
  function wsStatusLabel(status : string) {
    if (status === 'connected') return 'WebSocket Connected';
    if (status === 'error') return 'WebSocket Error';
    return 'WebSocket';
  }
</script>

<!-- Navbar -->
<nav class="navbar bg-body-tertiary mb-4">
  <div class="container-fluid">
    <a class="navbar-brand" href="window:javascript:void(0)">🎛️ Soundboard</a>
    <div class="dropdown dropstart">
      <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        Settings
      </button>
      <ul class="dropdown-menu">
        <li>
          <a class="dropdown-item" href="window:javascript:void(0)" onclick={() => loadBuiltinConfig(0)}>Test Sample</a>
        </li>
        <li><hr class="dropdown-divider"></li>
        <li>
          <label class="dropdown-item mb-0" for="upload-config">Upload Custom Config</label>
          <input type="file" id="upload-config" class="d-none" accept="application/json" onchange={loadFile} />
        </li>
        <li>
          <label class="dropdown-item mb-0" for="upload-package">Upload Sound Package</label>
          <input type="file" id="upload-package" class="d-none" accept="application/zip" onchange={loadPackage} />
        </li>
      </ul>
    </div>
  </div>
</nav>

<!-- Main Container -->
<div class="container-fluid">

  <!-- Soundboard Tabs -->
  <ul class="nav nav-tabs mb-4" role="tablist">
    {#each soundboards as soundboard, i (soundboard.id)}
      <li class="nav-item" role="presentation">
        <button
          class="nav-link"
          class:active={i === activeIndex}
          type="button"
          role="tab"
          onclick={() => (activeIndex = i)}
        >
          {#if wsStatuses[soundboard.id]}
            <span class="badge me-2 {wsStatusClass(wsStatuses[soundboard.id])}">
              {wsStatusLabel(wsStatuses[soundboard.id])}
            </span>
          {/if}

          {soundboard.config._name ?? 'Soundboard'}
          
          <a
            class="btn-close ms-2"
            aria-label="Close"
            href="window:javascript:void(0)"
            onclick={(e) => {
              e.stopPropagation();
              closeSoundboard(i);
            }}
          ></a>
        </button>
      </li>
    {/each}
  </ul>

  <!-- Active Soundboard Contents -->
  <div class="tab-content">
    {#each soundboards as soundboard, i (soundboard.id)}
      <Soundboard
        config={soundboard.config}
        active={i === activeIndex}
        onWsStatus={(status) => (wsStatuses[soundboard.id] = status)}
      />
    {/each}
  </div>
</div>

<!-- Toast Notification Element -->
<div class="toast-container position-fixed bottom-0 end-0 p-3">
  <div bind:this={toastEl} class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header">
      <strong class="me-auto">Soundboard loaded</strong>
      <small>now</small>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      <p>{toast?.title ?? ''}</p>
      <p>{toast?.subtitle ?? ''}</p>
    </div>
  </div>
</div>
