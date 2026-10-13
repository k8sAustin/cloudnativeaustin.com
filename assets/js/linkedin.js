(function () {
  'use strict';

  var INTERVAL_MS = 8000;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svg(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  function formatDate(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3) return value || '';
    var month = months[Number(parts[1]) - 1];
    if (!month) return value;
    return month + ' ' + Number(parts[2]) + ', ' + parts[0];
  }

  function button(label, icon) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'icon-btn gallery-control';
    el.setAttribute('aria-label', label);
    el.innerHTML = icon;
    return el;
  }

  function init(root) {
    var status = document.createElement('p');
    status.className = 'gallery-status';
    status.textContent = 'Loading LinkedIn posts…';
    root.appendChild(status);

    fetch('assets/data/linkedin.json')
      .then(function (response) {
        if (!response.ok) throw new Error('missing posts');
        return response.json();
      })
      .then(function (data) {
        var posts = (data && data.posts) || [];
        if (!posts.length) throw new Error('empty posts');
        status.remove();
        render(root, posts, data.source);
      })
      .catch(function () {
        status.textContent = 'LinkedIn posts are unavailable right now.';
      });
  }

  function render(root, posts, source) {
    var index = 0;
    var paused = reducedMotion;
    var timer = null;

    root.classList.add('posts');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'LinkedIn posts');

    var card = document.createElement('article');
    card.className = 'post-card';
    card.tabIndex = 0;
    card.setAttribute('aria-label', 'Selected LinkedIn post. Use the arrow keys to change posts.');

    var meta = document.createElement('p');
    meta.className = 'post-meta';
    var date = document.createElement('time');
    var reactions = document.createElement('span');
    meta.append(date, reactions);

    var title = document.createElement('h3');
    var body = document.createElement('p');
    body.className = 'post-text';

    var link = document.createElement('a');
    link.className = 'post-link';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Read on LinkedIn';

    card.append(meta, title, body, link);

    var toolbar = document.createElement('div');
    toolbar.className = 'gallery-toolbar';
    var count = document.createElement('p');
    count.className = 'gallery-count mono';
    var controls = document.createElement('div');
    controls.className = 'gallery-controls';
    var prev = button('Previous post', svg('<path d="M15 5 8 12l7 7"/>'));
    var pause = button('Pause slideshow', svg('<path d="M9 5v14M15 5v14"/>'));
    var next = button('Next post', svg('<path d="m9 5 7 7-7 7"/>'));
    controls.append(prev, pause, next);
    toolbar.append(count, controls);

    var dots = document.createElement('div');
    dots.className = 'post-dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Choose a post');

    root.append(card, toolbar, dots);

    posts.forEach(function (post, dotIndex) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'post-dot';
      dot.setAttribute('aria-label', 'Show ' + (post.title || 'post') + ', post ' + (dotIndex + 1));
      dot.addEventListener('click', function () {
        paused = true;
        setPauseState();
        stop();
        show(dotIndex);
      });
      dots.appendChild(dot);
    });

    if (source) {
      var credit = document.createElement('p');
      credit.className = 'gallery-credit';
      var sourceLink = document.createElement('a');
      sourceLink.href = source;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener';
      sourceLink.textContent = 'Follow Cloud Native Austin on LinkedIn';
      credit.appendChild(sourceLink);
      root.appendChild(credit);
    }

    function setPauseState() {
      pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      pause.innerHTML = paused
        ? svg('<path d="m8 5 11 7-11 7V5Z"/>')
        : svg('<path d="M9 5v14M15 5v14"/>');
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (paused || posts.length < 2) return;
      timer = window.setInterval(function () { show(index + 1); }, INTERVAL_MS);
    }

    function show(nextIndex) {
      index = (nextIndex + posts.length) % posts.length;
      var post = posts[index];
      date.dateTime = post.date || '';
      date.textContent = formatDate(post.date);
      reactions.textContent = post.reactions ? post.reactions + ' reactions' : '';
      title.textContent = post.title || 'LinkedIn post';
      body.textContent = post.text || '';
      link.href = post.url;
      count.textContent = (index + 1) + ' / ' + posts.length;
      Array.prototype.forEach.call(dots.children, function (dot, dotIndex) {
        var current = dotIndex === index;
        dot.setAttribute('aria-current', current ? 'true' : 'false');
        dot.tabIndex = current ? 0 : -1;
      });
    }

    prev.addEventListener('click', function () {
      paused = true;
      setPauseState();
      stop();
      show(index - 1);
    });
    next.addEventListener('click', function () {
      paused = true;
      setPauseState();
      stop();
      show(index + 1);
    });
    pause.addEventListener('click', function () {
      paused = !paused;
      setPauseState();
      if (paused) stop();
      else start();
    });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        paused = true;
        setPauseState();
        stop();
        show(index - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        paused = true;
        setPauseState();
        stop();
        show(index + 1);
      }
    });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', function (event) {
      if (!root.contains(event.relatedTarget)) start();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    setPauseState();
    show(0);
    start();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-linkedin]').forEach(init);
  });
})();
