import { h } from '/src/utils/dom.js';

export function LoginArea({ onLoginClick }) {
  const userText = h('p', { text: 'Checking login...' });
  const errorText = h('p', { role: 'alert' });

  let isBusy = false;
  let isReady = false;

  const loginBtn = h('button', {
    text: 'Sign in',
    type: 'button',
    disabled: true,

    onClick: async () => {
      if (isBusy) return;

      isBusy = true;
      loginBtn.disabled = true;
      errorText.textContent = '';

      try {
        await onLoginClick();
      } catch (error) {
        errorText.textContent = error.message;
      } finally {
        isBusy = false;
        loginBtn.disabled = !isReady;
      }
    },
  });

  const element = h('div', { className: 'login-area' }, loginBtn, userText, errorText);

  function setUser(user) {
    isReady = true;

    userText.textContent = user
      ? `Signed in as ${user.displayName || 'User'}`
      : 'Sign in to leave a comment.';

    loginBtn.textContent = user ? 'Sign out' : 'Sign in with Google';
    loginBtn.disabled = isBusy;
  }

  return { element, setUser };
}
