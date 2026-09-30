(function () {
  'use strict';

  var INTERVAL_MS = 5000;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svg(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  function unique(values) {
    var seen = {};
    var out = [];
    values.forEach(function (value) {
      if (!value || seen[value]) return;
      seen[value] = true;
      out.push(value);
    });
    return out;
  }

  function init(root) {
    var status = document.createElement('p');
    status.className = 'gallery-status';
    status.textContent = 'Loading meetup photos…';
    root.appendChild(status);

    fetch('assets/data/photos.json')
      .then(function (response) {
        if (!response.ok) throw new Error('missing photo list');
        return response.json();
      })
      .then(function (data) {
        var photos = (data && data.photos) || [];
        if (!photos.length) throw new Error('empty photo list');
        status.remove();
        render(root, photos, data.source);
      })
      .catch(function () {
        status.textContent = 'Meetup photos are unavailable right now.';
      });
  }

  function render(root, photos, source) {
    var years = unique(photos.map(function (photo) { return photo.year; }));
    var albums = unique(photos.map(function (photo) { return photo.album; }));
    var filterKey = years.length > 1 ? 'year' : (albums.length > 1 ? 'album' : '');
    var filterValue = 'all';
    var index = 0;
    var paused = reducedMotion;
    var timer = null;

    root.classList.add('gallery');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'Meetup photos');

    var filters = document.createElement('div');
    filters.className = 'gallery-filters';
    filters.hidden = !filterKey;

    var stage = document.createElement('div');
    stage.className = 'gallery-stage';
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Selected meetup photo. Use the arrow keys to change photos.');

    var image = document.createElement('img');
    image.className = 'gallery-slide';
    image.alt = '';
    image.decoding = 'async';
    stage.appendChild(image);

    var toolbar = document.createElement('div');
    toolbar.className = 'gallery-toolbar';

    var caption = document.createElement('p');
    caption.className = 'gallery-caption';

    var count = document.createElement('p');
    count.className = 'gallery-count mono';

    var controls = document.createElement('div');
    controls.className = 'gallery-controls';

    var prev = button('Previous photo', svg('<path d="M15 5 8 12l7 7"/>'));
    var pause = button('Pause slideshow', svg('<path d="M9 5v14M15 5v14"/>'));
    var next = button('Next photo', svg('<path d="m9 5 7 7-7 7"/>'));
    controls.append(prev, pause, next);

    toolbar.append(caption, count, controls);

    var thumbs = document.createElement('div');
    thumbs.className = 'gallery-thumbs';
    thumbs.setAttribute('role', 'group');
    thumbs.setAttribute('aria-label', 'Choose a photo');

    root.append(filters, stage, toolbar, thumbs);

    function button(label, icon) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'icon-btn gallery-control';
      el.setAttribute('aria-label', label);
      el.innerHTML = icon;
      return el;
    }

    function visiblePhotos() {
      if (!filterKey || filterValue === 'all') return photos;
      return photos.filter(function (photo) { return photo[filterKey] === filterValue; });
    }

    function setPauseState() {
      pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pause.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      pause.innerHTML = paused
        ? svg('<path d="m8 5 11 7-11 7V5Z"/>')
        : svg('<path d="M9 5v14M15 5v14"/>');
      caption.setAttribute('aria-live', paused ? 'polite' : 'off');
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (paused || visiblePhotos().length < 2) return;
      timer = window.setInterval(function () { go(1); }, INTERVAL_MS);
    }

    function show(nextIndex) {
      var items = visiblePhotos();
      if (!items.length) return;
      index = (nextIndex + items.length) % items.length;
      var photo = items[index];
      var label = (photo.title || photo.album || 'Meetup photo') + ', photo ' + (index + 1) + ' of ' + items.length;
      image.alt = label;
      image.src = photo.src;
      caption.textContent = photo.title || photo.album || 'Meetup photo';
      count.textContent = (index + 1) + ' / ' + items.length;
      Array.prototype.forEach.call(thumbs.children, function (thumb, thumbIndex) {
        var current = thumbIndex === index;
        thumb.setAttribute('aria-current', current ? 'true' : 'false');
        thumb.tabIndex = current ? 0 : -1;
        if (current) {
          var left = thumb.offsetLeft;
          var right = left + thumb.offsetWidth;
          if (left < thumbs.scrollLeft) thumbs.scrollLeft = left;
          else if (right > thumbs.scrollLeft + thumbs.clientWidth) thumbs.scrollLeft = right - thumbs.clientWidth;
        }
      });
    }

    function go(step) {
      show(index + step);
    }

    function buildFilters() {
      filters.replaceChildren();
      if (!filterKey) return;
      var options = ['all'].concat(filterKey === 'year' ? years : albums);
      options.forEach(function (option) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'gallery-filter';
        chip.textContent = option === 'all' ? 'All photos' : option;
        chip.setAttribute('aria-pressed', option === filterValue ? 'true' : 'false');
        chip.addEventListener('click', function () {
          filterValue = option;
          Array.prototype.forEach.call(filters.children, function (child) {
            child.setAttribute('aria-pressed', child === chip ? 'true' : 'false');
          });
          buildThumbs();
          show(0);
          start();
        });
        filters.appendChild(chip);
      });
    }

    function buildThumbs() {
      thumbs.replaceChildren();
      visiblePhotos().forEach(function (photo, thumbIndex) {
        var thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'gallery-thumb';
        thumb.setAttribute('aria-label', 'Show ' + (photo.title || 'photo') + ', photo ' + (thumbIndex + 1));
        var thumbImage = document.createElement('img');
        thumbImage.src = photo.thumb;
        thumbImage.alt = '';
        thumbImage.loading = 'lazy';
        thumbImage.decoding = 'async';
        thumb.appendChild(thumbImage);
        thumb.addEventListener('click', function () {
          paused = true;
          setPauseState();
          stop();
          show(thumbIndex);
        });
        thumbs.appendChild(thumb);
      });
    }

    prev.addEventListener('click', function () {
      paused = true;
      setPauseState();
      stop();
      go(-1);
    });
    next.addEventListener('click', function () {
      paused = true;
      setPauseState();
      stop();
      go(1);
    });
    pause.addEventListener('click', function () {
      paused = !paused;
      setPauseState();
      if (paused) stop();
      else start();
    });
    stage.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        paused = true;
        setPauseState();
        stop();
        go(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        paused = true;
        setPauseState();
        stop();
        go(1);
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

    if (source) {
      var credit = document.createElement('p');
      credit.className = 'gallery-credit';
      var link = document.createElement('a');
      link.href = source;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Open the album on Google Drive';
      credit.appendChild(link);
      root.appendChild(credit);
    }

    buildFilters();
    buildThumbs();
    setPauseState();
    show(0);
    start();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-gallery]').forEach(init);
  });
})();
