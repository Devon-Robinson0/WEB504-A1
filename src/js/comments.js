import { Footer } from '/src/components/footer/footer.js';
import { Header } from '/src/components/header/header.js';
import { h, Svg } from '../utils/dom.js';
import { auth, db } from '../firebase/config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {
  ref,
  push,
  set,
  onDisconnect,
  onValue,
  query,
  update,
  remove,
  orderByChild,
  limitToLast,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js';

const messagesRef = ref(db, 'messages');

const main = document.getElementById('comments');

// Built header and footer
const header = document.getElementById('header');
header.replaceWith(Header());
const footer = document.getElementById('footer');
footer.replaceWith(Footer());

let chatBox;
let loginArea;
let commentInput;
let sendBtn;

let stopMessagesListener;
let stopOnlineListener;

const editIcon = await Svg('/src/icons/edit-icon.svg');
const delIcon = await Svg('/src/icons/delete-icon.svg');

function stopChatListeners() {
  stopMessagesListener?.();
  stopOnlineListener?.();

  stopMessagesListener = null;
  stopOnlineListener = null;
}

const provider = new GoogleAuthProvider();

const loginBtn = h('button', {
  text: 'Sign in',
  type: 'button',
  disabled: true,
  onClick: async () => {
    loginBtn.disabled = true;
    errorText.textContent = '';

    try {
      if (auth.currentUser) {
        try {
          await stopPresence();
        } catch (error) {
          console.error('Could not clear online presence:', error);
        }

        await signOut(auth);
        showNotification('You have signed out.', 'success');
      } else {
        showNotification('Signing in...');

        await signInWithPopup(auth, provider);

        showNotification('Successfully signed in!', 'success');
      }
    } catch (error) {
      errorText.textContent = error.message;
      showNotification('Could not complete sign-in or sign-out. Please try again.', 'error');
      console.error('Authentication failed:', error);
    } finally {
      loginBtn.disabled = false;
    }
  },
});

const userText = h('p', { text: 'Checking login...' });
const errorText = h('p', { role: 'alert' });

loginArea = h('div', { className: 'login-area' }, loginBtn, userText, errorText);

const onlineList = h('div', {
  id: 'online-users',
  class: 'online-list',
});
onlineList.hidden = true;

const onlineCount = h('button', {
  text: '0 online',
  type: 'button',
  'aria-expanded': 'false',
  'aria-controls': 'online-users',
  className: 'online-count',
  onClick: () => {
    onlineList.hidden = !onlineList.hidden;

    onlineCount.setAttribute('aria-expanded', String(!onlineList.hidden));
  },
});

const onlineArea = h(
  'div',
  {
    className: 'online-area',
  },
  onlineCount,
  onlineList,
);

let stopConnectionListener;
let presenceRef;
let presenceWrite = Promise.resolve();

function startPresence(user) {
  stopConnectionListener = onValue(ref(db, '.info/connected'), (snapshot) => {
    if (snapshot.val() !== true) return;

    const connectionRef = push(ref(db, `presence/${user.uid}`));

    presenceRef = connectionRef;

    presenceWrite = (async () => {
      await onDisconnect(connectionRef).remove();

      await set(connectionRef, {
        name: user.displayName || 'User',
        photoURL: user.photoURL || '',
      });
    })();

    presenceWrite.catch(console.error);
  });
}

async function stopPresence() {
  stopConnectionListener?.();
  stopConnectionListener = null;

  await presenceWrite.catch(() => {});

  if (presenceRef) {
    await remove(presenceRef);
    presenceRef = null;
  }
}

onAuthStateChanged(auth, (user) => {
  stopChatListeners();
  loginBtn.disabled = false;

  if (user) {
    userText.textContent = `Signed in as ${user.displayName}`;
    loginBtn.textContent = 'Sign out';

    stopMessagesListener = listenForMessages();
    stopOnlineListener = listenForOnlineUsers();

    if (!stopConnectionListener) {
      startPresence(user);
    }
  } else {
    stopConnectionListener?.();
    stopConnectionListener = null;

    userText.textContent = 'Sign in to leave a comment.';
    loginBtn.textContent = 'Sign in with Google';

    chatBox.replaceChildren();
    onlineList.replaceChildren();
    onlineCount.textContent = 'Sign in to view online users';
    onlineList.hidden = true;
    onlineCount.setAttribute('aria-expanded', 'false');
  }
});

function createMain() {
  main.append(
    h('article', { className: 'heading-container' }, [
      h('h1', { text: 'Comments' }),
      h('p', { text: 'Say hello, share feedback, join in on the conversation' }),
    ]),
  );

  chatBox = h('div', { id: 'chat-box' });
  let headingOnlineContainer;

  main.append(
    h('div', { className: 'comment-box' }, [
      h(
        'div',
        { className: 'chat-box-heading' },
        (headingOnlineContainer = h(
          'div',
          { className: 'heading-online-container' },
          h('h2', { text: 'Live Chat' }),
          onlineArea,
        )),
        loginArea,
      ),

      chatBox,
      h('div', { className: 'comment-section' }, [
        (commentInput = h('input', {
          placeholder: 'Write a comment...',
          id: 'comment-input',
          name: 'comment-input',
          type: 'text',
        })),
        (sendBtn = h('button', {
          text: 'Send',
          id: 'sendBtn',
        })),
      ]),
    ]),
  );

  document.body.append(h('div', { id: 'notification-container' }));
}
createMain();

const touchControls = window.matchMedia('(hover: none)');

document.addEventListener('click', (event) => {
  if (!touchControls.matches) return;

  const message = event.target.closest('#chat-box .message.my-message');

  if (message && event.target.closest('button, textarea, input')) {
    return;
  }

  const wasOpen = message?.classList.contains('actions-open');

  chatBox.querySelectorAll('.actions-open').forEach((element) => {
    element.classList.remove('actions-open');
  });

  if (message && !wasOpen) {
    message.classList.add('actions-open');
  }
});

function listenForOnlineUsers() {
  return onValue(
    ref(db, 'presence'),
    (snapshot) => {
      onlineList.replaceChildren();

      let count = 0;

      snapshot.forEach((userSnapshot) => {
        const connections = userSnapshot.val();
        const user = Object.values(connections)[0];

        if (!user) return;
        count++;

        onlineList.append(
          h(
            'div',
            { className: 'online-user' },
            user.photoURL
              ? h('img', {
                  src: user.photoURL,
                  alt: '',
                  className: 'online-avatar',
                  referrerpolicy: 'no-referrer',
                })
              : h('span', {
                  className: 'online-avatar',
                  text: user.name.charAt(0).toUpperCase(),
                }),
            h('span', { text: user.name }),
            h('span', {
              className: 'online-dot',
              'aria-label': 'Online',
            }),
          ),
        );
      });

      onlineCount.innerHTML = `<span class="count-dot"></span>${count} online `;
    },
    (error) => {
      showNotification('Could not load online users.', 'error');
      console.error('Could not load online users', error);
    },
  );
}
sendBtn.addEventListener('click', sendMsg);

let isSending = false;

async function sendMsg() {
  if (isSending) return;

  const user = auth.currentUser;
  const text = commentInput.value.trim();

  if (!user) {
    showNotification('Please sign in first', 'error');
    return;
  }

  if (!text) {
    showNotification('Your message cannot be empty.', 'error');
    return;
  }

  if (text.length > 1000) {
    showNotification('Messages must be 1000 characters or fewer', 'error');
    return;
  }

  isSending = true;
  sendBtn.disabled = true;
  commentInput.disabled = true;

  try {
    await push(messagesRef, {
      uid: user.uid,
      name: user.displayName || 'User',
      photoURL: user.photoURL || '',
      text,
      createdAt: serverTimestamp(),
    });

    commentInput.value = '';
  } catch (err) {
    showNotification('Could not send message', 'error');
    console.error('Could not send message:', err);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    commentInput.disabled = false;
  }
}

commentInput.addEventListener('keydown', (e) => {
  if (e.isComposing) return;

  if (e.key == 'Enter') {
    e.preventDefault();
    sendMsg();
  }
});
function listenForMessages() {
  return onValue(
    messagesRef,
    (snapshot) => {
      chatBox.replaceChildren();

      snapshot.forEach((child) => {
        const message = child.val();
        const messageId = child.key;
        const isMine = message.uid === auth.currentUser?.uid;

        let messageEl;
        let textEl;

        const time = new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        chatBox.append(
          (messageEl = h(
            'div',
            {
              className: isMine ? 'message my-message' : 'message',
              tabindex: isMine ? 0 : -1,
            },
            message.photoURL
              ? h('img', {
                  src: message.photoURL,
                  alt: '',
                  className: 'user-avatar',
                  referrerpolicy: 'no-referrer',
                })
              : h('span', {
                  className: 'user-avatar default',
                  text: (message.name || 'User').charAt(0).toUpperCase(),
                }),
            h('p', { text: message.name, className: 'user-name' }),
            h('span', { text: `(${time})`, className: 'time-stamp' }),
            (textEl = h('p', { text: message.text, className: 'message-text' })),
          )),
        );

        if (isMine) {
          const delBtn = h(
            'button',
            {
              'aria-label': 'Delete message',
              title: 'Delete message',
              type: 'button',
              className: 'del-btn',
              onClick: async () => {
                if (!confirm('Delete this message?')) return;

                try {
                  await remove(ref(db, `messages/${messageId}`));
                  showNotification('Message deleted.', 'success');
                } catch (error) {
                  showNotification('Could not delete your message.', 'error');
                  console.error('Could not delete message:', error);
                }
              },
            },
            delIcon.cloneNode(true),
          );

          const editBtn = h(
            'button',
            {
              'aria-label': 'Edit message',
              title: 'Edit message',
              type: 'button',
              className: 'edit-btn',
              onClick: startEditing,
            },
            editIcon.cloneNode(true),
          );

          messageEl.append(delBtn);
          messageEl.append(editBtn);

          function startEditing() {
            editBtn.hidden = true;

            const editor = h('textarea', {
              className: 'message-editor',
              rows: 1,
              'aria-label': 'Edit message',
            });

            const saveBtn = h('button', {
              text: 'Save',
              type: 'button',
              className: 'save-btn',
              onClick: async () => {
                const text = editor.value.trim();

                if (!text) {
                  showNotification('Your message cannot be empty.', 'error');
                  return;
                }

                if (text.length > 1000) {
                  showNotification('Messages must be 1000 characters or fewer.', 'error');
                  return;
                }

                try {
                  await update(ref(db, `messages/${messageId}`), { text });

                  message.text = text;
                  finishEditing(text);
                  showNotification('Message updated.', 'success');
                } catch (err) {
                  showNotification('Could not save your changes. Please try again.', 'error');
                  console.error('Error updating message', err);
                }
              },
            });

            editor.value = message.text;
            textEl.replaceWith(editor);
            editor.focus();
            editor.setSelectionRange(editor.value.length, editor.value.length);
            delBtn.replaceWith(saveBtn);

            function finishEditing(text) {
              textEl.textContent = text;
              editor.replaceWith(textEl);
              saveBtn.replaceWith(delBtn);
              editBtn.hidden = false;
            }

            editor.addEventListener('keydown', (event) => {
              if (event.isComposing) return;

              if (event.key === 'Escape') {
                event.preventDefault();
                finishEditing(message.text);
                return;
              }

              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                saveBtn.click();
              }
            });
          }
        }
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    },
    (error) => {
      showNotification('Could not load chat messages.', 'error');
      console.error('Could not load messages', error);
    },
  );
}

function showNotification(message, type = 'info', duration = 5000) {
  const notificationContainer = document.getElementById('notification-container');
  if (!notificationContainer) return;

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;

  notification.append(
    h('span', {
      className: 'notification-message',
      text: message,
    }),
    h('button', {
      className: 'notification-close',
      type: 'button',
      text: '×',
      'aria-label': 'Dismiss notification',
      onClick: () => notification.remove(),
    }),
  );

  notification.setAttribute('role', type === 'error' ? 'alert' : 'status');

  notificationContainer.appendChild(notification);

  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
}
