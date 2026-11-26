/**
 * js/theme-init.js — Se carga de forma síncrona en <head> para aplicar el tema guardado
 * antes del primer pintado y evitar el destello de tema claro al cambiar de página.
 */
(function applySavedTheme() {
  try {
    // Marca que hay JS disponible: solo entonces el CSS oculta las secciones
    // que se revelarán al hacer scroll (sin JS, todo se ve desde el inicio).
    document.documentElement.classList.add('js-motion');
    if (sessionStorage.getItem('karamel_theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (error) {
    console.warn('Preferencia de tema no disponible', error);
  }
})();
