import { h } from '/src/utils/dom.js';

export function PresenceIndicator() {
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

  function updateList(snapshot) {
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
  }

  function reset() {
    onlineList.replaceChildren();
    onlineList.hidden = true;
    onlineCount.textContent = 'Sign in to view online users';
    onlineCount.setAttribute('aria-expanded', 'false');
  }

  return { onlineArea, updateList, reset };
}
