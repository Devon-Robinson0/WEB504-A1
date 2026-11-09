import { h } from "../utils/dom.js";
import { auth, db } from "../firebase/config.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
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
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js';

const messagesRef = ref(db, 'messages');

const main = document.getElementById("comments");

let chatBox;
let loginArea;
let commentInput;
let sendBtn;

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
        await stopPresence();
        await signOut(auth);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      errorText.textContent = error.message;
    } finally {
      loginBtn.disabled = false;
    }
  }
});

const userText = h('p', { text: 'Checking login...' });
const errorText = h('p', { role: 'alert' });

loginArea = h('div', { className: 'login-area' },
    loginBtn,
    userText,
    errorText
);

const onlineList = h('div', {
    id: 'online-users',
    class: 'online-list'
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

        onlineCount.setAttribute(
            'aria-expanded',
            String(!onlineList.hidden)
        );
    }
});

const onlineArea = h('div', {
    className: 'online-area'
}, onlineCount, onlineList);

let stopConnectionListener;
let presenceRef;
let presenceWrite = Promise.resolve();

function startPresence(user) {
    stopConnectionListener = onValue(
        ref(db, '.info/connected'),
        (snapshot) => {
            if (snapshot.val() !== true) return;

            const connectionRef = push(
                ref(db, `presence/${user.uid}`)
            );

            presenceRef = connectionRef;

            presenceWrite = (async () => {
                await onDisconnect(connectionRef).remove();

                await set(connectionRef, {
                    name: user.displayName || 'User',
                    photoURL: user.photoURL || ''
                });
            })();

            presenceWrite.catch(console.error);
        } 
    )
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
  loginBtn.disabled = false;

  if (user) {
    userText.textContent = `Signed in as ${user.displayName}`;
    loginBtn.textContent = 'Sign out';

    if (!stopConnectionListener) {
        startPresence(user);
    }
  } else {
    userText.textContent = 'Sign in to leave a comment.';
    loginBtn.textContent = 'Sign in with Google';
  }
});

// create heading
function createMain() {
    main.append(h('article', { className: 'heading-container' }, 
        [
            h('h1', { text: 'Comments' }), 
            h('p', { text: 'Say hello, share feedback, join in on the conversation'})
        ]
    ));

    chatBox = h('div', { id: 'chat-box'});
    let headingOnlineContainer;


    main.append(h('div', { className: 'comment-box' }, 
        [
            h('div', { className: 'chat-box-heading'}, 
                headingOnlineContainer = h('div', { className: 'heading-online-container' },
                    h('h2', { text: 'Live Chat' }), onlineArea
                ), loginArea
            ),

            chatBox,
            h('div', { className: 'comment-section'}, 
                [
                    commentInput = h('input', { 
                        placeholder: 'Write a comment...',
                        id: 'comment-input',
                        name: 'comment-input',
                        type: 'text' }),
                    sendBtn = h('button', { 
                        text: 'Send', 
                        id: 'sendBtn' })
            ])
        ]
    ));
}
createMain();

onValue(ref(db, 'presence'), (snapshot) => {
    onlineList.replaceChildren();

    let count = 0;

    snapshot.forEach((userSnapshot) => {
        const connections = userSnapshot.val();
        const user = Object.values(connections)[0];

        if (!user) return;
        count++;

        onlineList.append(
            h('div', { className: 'online-user' },
                user.photoURL
                    ? h('img', {
                        src: user.photoURL,
                        alt: '',
                        className: 'online-avatar',
                        referrerpolicy: 'no-referrer'
                    })
                    : h('span', {
                        className: 'online-avatar',
                        text: user.name.charAt(0).toUpperCase()
                    }),
                h('span', { text: user.name }),
                h('span', {
                    className: 'online-dot',
                    'aria-label': 'Online'
                })
            )
        );
    });

    onlineCount.innerHTML = `<span class="count-dot"></span>${count} online `;
}, (error) => {
    console.error('Could not load online users', error);
});

sendBtn.addEventListener('click', sendMsg);

async function sendMsg() {
    const user = auth.currentUser;
    const text = commentInput.value.trim();

    if (!user) {
        alert("please sign in first");
        return;
    }

    if (!text)
        return;

    try {
        await push(messagesRef, 
        {
            uid: user.uid,
            name: user.displayName || 'User',
            photoURL: user.photoURL || '',
            text,
            createdAt: serverTimestamp()
        });

        commentInput.value = '';
    } catch (err) {
        console.log('could not send message: ', err);
    }
};

commentInput.addEventListener('keydown', (e) => {
    if (e.key == 'Enter') {
        e.preventDefault();
        sendMsg();
    }
})

onValue(messagesRef, (snapshot) => {
    chatBox.replaceChildren();

    snapshot.forEach((child) => {
        const message = child.val()
        const messageId = child.key;
        const isMine = message.uid === auth.currentUser?.uid;

        let messageEl;
        let textEl;

        const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
        });

        chatBox.append(
            messageEl = h('div', { 
                className: isMine ? 'message my-message' : 'message'
            },
            message.photoURL
            ? h('img', {
                src: message.photoURL,
                alt: '',
                className: 'user-avatar',
                referrerpolicy: 'no-referrer'
            })
            : h('span', {
                className: 'user-avatar default',
                text: (message.name || 'User').charAt(0).toUpperCase()
            }),
                h('p', { text: message.name, className: 'user-name'}),
                h('span', { text: `(${time})`, className: 'time-stamp'}),
                textEl = h('p', { text: message.text, className: 'message-text'})
            )
        );

        if (isMine) {
            const delBtn = h('button', 
                {
                    text: 'Delete',
                    type: 'button',
                    className: 'del-btn',
                    onClick: async () => {
                        if (!confirm('Delete this message?')) return;

                        try {
                            await remove(ref(db, `messages/${messageId}`));
                        } catch (err) {
                            console.error('Could not delete message:', error)
                        }
                    }
                }
            );

            const editBtn = h('button', 
            {
                text: 'Edit',
                type: 'button',
                className: 'edit-btn',
                onClick: startEditing
            });

            messageEl.append(delBtn);
            messageEl.append(editBtn);
            
            function startEditing() {
                editBtn.hidden = true;

                const editor = h('textarea',
                    {
                        className: 'message-editor',
                        rows: 2,
                        'aria-label': 'Edit message'
                    }
                );

                const saveBtn = h('button', 
                {
                    text: 'Save',
                    type: 'button',
                    className: 'save-btn',
                    onClick: async () => {
                    
                        const text = editor.value.trim();

                        if (!text || text.length > 1000) {
                            console.log("Message is over 1000 characters")
                            return;
                        }

                        try {
                            await update(ref(db, `messages/${messageId}`), { text });

                            message.text = text;
                            finishEditing(text);
                        } catch (err) {
                            console.error("Err updating message", err)
                        }
                    }
                });

                editor.value = message.text;
                textEl.replaceWith(editor);
                editor.focus()
                editor.setSelectionRange(editor.value.length, editor.value.length);
                delBtn.replaceWith(saveBtn);

                function finishEditing(text) {
                    textEl.textContent = text;
                    editor.replaceWith(textEl);
                    saveBtn.replaceWith(delBtn);
                    editBtn.hidden = false;
                }

                editor.addEventListener('keydown', async (event) => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        finishEditing(message.text);
                        return;
                    }

                    if (event.key !== 'Enter' || event.shiftKey) return;

                    event.preventDefault();

                    const text = editor.value.trim();

                    if (!text || text.length > 1000) {
                        console.log("Message is over 1000 characters")
                        return;
                    }

                    try {
                        await update(ref(db, `messages/${messageId}`), { text });

                        message.text = text;
                        finishEditing(text);
                    } catch (err) {
                        console.error("Err updating message", err)
                    }
                });
            }

            

            
        }
    })

    chatBox.scrollTop = chatBox.scrollHeight;
}, (error) => {
    console.error('Could not load messages', error)
})
