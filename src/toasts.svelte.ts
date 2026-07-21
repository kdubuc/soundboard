export const toasts = $state<{ id : string; title : string; subtitle : string }[]>([]);

export function showToast(title : string, subtitle : string, duration = 3000) : void {
  const id = crypto.randomUUID();
  toasts.push({ id, title, subtitle });
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id);
    if (idx !== -1) {
      toasts.splice(idx, 1);
    }
  }, duration);
}