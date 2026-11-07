import { h } from "../utils/dom.js";

const main = document.getElementById("comments");

let chatBox;

// create heading
function createMain() {
    main.append(h('article', { className: 'heading-container' }, 
        [
            h('h1', { text: 'Comments' }), 
            h('p', { text: 'Say hello, share feedback, join in on the conversation'})
        ]
    ));

    chatBox = h('div', { id: 'chat-box'});

    main.append(h('div', { className: 'comment-box' }, 
        [
            h('div', { className: 'chat-box-heading'}, 
                [
                    h('h2', { text: 'Live Chat' })
                ]),
            chatBox,
            h('div', { className: 'comment-section'}, 
                [
                    h('input', { 
                        placeholder: 'Write a comment...',
                        id: 'comment-input',
                        name: 'comment-input',
                        type: 'text' }),
                    h('button', { 
                        text: 'Send', 
                        id: 'sendBtn' })
            ])
        ]
    ))
}

createMain();