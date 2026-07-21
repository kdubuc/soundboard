<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toasts } from './toasts.svelte';
</script>

<div class="toast-container position-fixed bottom-0 end-0 p-3">
  {#each toasts as toast (toast.id)}
    <div
      class="toast show"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      transition:fly={{ x: 50, duration: 300 }}
    >
      <div class="toast-header">
        <strong class="me-auto">{toast.title}</strong>
        <small>now</small>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          onclick={() => {
            const idx = toasts.findIndex(t => t.id === toast.id);
            if (idx !== -1) toasts.splice(idx, 1);
          }}
        ></button>
      </div>
      <div class="toast-body">{toast.subtitle}</div>
    </div>
  {/each}
</div>