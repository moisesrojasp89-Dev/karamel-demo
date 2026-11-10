/**
 * js/theme-init.js — Se carga de forma síncrona en <head> para aplicar el tema guardado
 * antes del primer pintado y evitar el destello de tema claro al cambiar de página.
 */
(function applySavedTheme() {
  try {
    if (sessionStorage.getItem('karamel_theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (error) {
    console.warn('Preferencia de tema no disponible', error);
  }
})();
