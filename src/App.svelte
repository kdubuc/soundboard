<script lang="ts">
  import { onMount } from 'svelte';
  import type { SoundboardConfig } from './types';
  import Soundboard from './Soundboard.svelte';
  import JSZip from 'jszip';
  import Toast from './Toast.svelte';
  import { showToast } from './toasts.svelte';

  interface SoundboardEntry {
    id : string;
    config : SoundboardConfig;
  }

  // Initialize the soundboards state
  const soundboards = $state<SoundboardEntry[]>([]);
  
  let activeIndex = $state(0);
  let wsStatuses = $state<Record<string, string>>({});

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

    addSoundboard(config);
  }

  // Add a new soundboard configuration to the list and persist it to localStorage
  async function addSoundboard(config : SoundboardConfig) : Promise<void> {
    soundboards.push({ id: crypto.randomUUID(), config }); // Add the new soundboard to the list

    activeIndex = soundboards.length - 1; // Set the newly loaded soundboard as active

    // Show a toast notification to indicate that the soundboard has been loaded
    showToast(config._name ?? 'Soundboard loaded', config._description ?? 'A newly loaded soundboard was added.');
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
<Toast />