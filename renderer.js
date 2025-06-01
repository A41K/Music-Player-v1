const { ipcRenderer } = require('electron');
const jsmediatags = require('jsmediatags');

document.addEventListener('DOMContentLoaded', () => {
  const bpmInput = document.querySelector('.bpm-input');
  const volumeSlider = document.querySelector('.volume-slider');
  const delButtons = document.querySelectorAll('.del-btn');
  const delAllButton = document.querySelector('.del-all');
  const playlistItems = document.querySelector('.playlist-items');
  const addFileButton = document.getElementById('add-file-button');
  const addFileInput = document.getElementById('add-file-input');
  const trackTimeDisplay = document.querySelector('.track-time');
  const timeBar = document.querySelector('.time-bar');
  const albumArtImage = document.getElementById('album-art-image');
  const playPauseButton = document.getElementById('play-pause-button');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const audio = new Audio();
  let currentTrack = null;
  let isPlaying = false;
  let masterPlaylist = []; // To store all playlist items in their original order

  // Set default album art on initial load
  albumArtImage.src = 'Default-Album.png';

  // Web Audio API setup
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(audio);
  const gainNode = audioContext.createGain();
  source.connect(gainNode).connect(audioContext.destination);

  const settingsButton = document.getElementById('settings-button');
  const settingsModal = document.getElementById('settings-modal');
  const closeButton = settingsModal.querySelector('.close-button');

  settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target == settingsModal) {
      settingsModal.style.display = 'none';
    }
  });



  const themeSelect = document.getElementById('theme-select');

  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.className = savedTheme;
    themeSelect.value = savedTheme;
  }

  // Save theme on change
  themeSelect.addEventListener('change', () => {
    const selectedTheme = themeSelect.value;
    document.body.className = selectedTheme;
    localStorage.setItem('theme', selectedTheme);
  });

  const soundQualitySelect = document.getElementById('sound-quality-select');

  // Load saved sound quality
  const savedSoundQuality = localStorage.getItem('soundQuality');
  if (savedSoundQuality) {
    soundQualitySelect.value = savedSoundQuality;
    // In a real application, you would apply the sound quality here.
    // For a simple browser Audio object, this is mostly a placeholder.
    console.log('Loaded sound quality:', savedSoundQuality);
  }

  // Save sound quality on change
  soundQualitySelect.addEventListener('change', () => {
    const selectedSoundQuality = soundQualitySelect.value;
    localStorage.setItem('soundQuality', selectedSoundQuality);
    applySoundQuality(selectedSoundQuality);
  });

  function applySoundQuality(quality) {
    // Disconnect previous nodes if any
    source.disconnect();
    gainNode.disconnect();

    let lastNode = source;

    if (quality === 'very-low') {
      // Simulate very low quality (e.g., telephone effect)
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.5;
      lastNode.connect(filter);
      lastNode = filter;

      const gain = audioContext.createGain();
      gain.gain.value = 0.5; // Reduce volume slightly
      lastNode.connect(gain);
      lastNode = gain;

    } else if (quality === 'low') {
      // Simulate low quality (e.g., old radio)
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.7;
      lastNode.connect(filter);
      lastNode = filter;

      const gain = audioContext.createGain();
      gain.gain.value = 0.8; // Reduce volume slightly
      lastNode.connect(gain);
      lastNode = gain;

    } else if (quality === 'medium') {
      // Medium quality (slight high-pass to remove some rumble)
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 80;
      filter.Q.value = 0.5;
      lastNode.connect(filter);
      lastNode = filter;

    } else if (quality === 'high') {
      // High quality (no significant filtering, direct connection)
      // No additional nodes needed, just connect to gainNode
    }

    lastNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
  }

  // Apply initial sound quality on load
  if (savedSoundQuality) {
    applySoundQuality(savedSoundQuality);
  } else {
    // Default to high quality if no setting saved
    applySoundQuality('high');
  }

  // Handle BPM input change
  bpmInput.addEventListener('input', (event) => {
    // You can add logic here to use the BPM value, e.g., for tempo adjustment
    console.log('BPM changed to:', event.target.value);
  });

  // Handle volume slider change
  volumeSlider.addEventListener('input', (event) => {
    audio.volume = event.target.value / 100;
  });

  // Handle individual delete buttons
  delButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.target.closest('.playlist-item').remove();
    });
  });

  // Handle "Del all" button
  delAllButton.addEventListener('click', () => {
    playlistItems.innerHTML = '';
    masterPlaylist = []; // Clear master playlist
    savePlaylist();
    // Reset song info when all songs are deleted
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    playPauseButton.textContent = 'Play';
    document.querySelector('.track-name').textContent = 'Track name - Artist name';
    albumArtImage.src = 'Default-Album.png'; // Set default album art
    currentTrack = null;
    playlistSearchInput.value = ''; // Clear search input
    playlistSortSelect.value = 'default'; // Reset sort dropdown
    filterAndSortPlaylist(); // Re-filter and sort after deleting all items
  });

  // Handle "Add File" button click
  addFileButton.addEventListener('click', () => {
    addFileInput.click(); // Trigger the hidden file input click
  });

  // Function to toggle play/pause
  function togglePlayPause() {
    if (isPlaying) {
      audio.pause();
      playPauseButton.textContent = 'Play';
    } else {
      audio.play();
      playPauseButton.textContent = 'Pause';
    }
    isPlaying = !isPlaying;
  }

  // Handle play/pause button click
  playPauseButton.addEventListener('click', () => {
    if (audio.src) {
      togglePlayPause();
    } else if (playlistItems.children.length > 0) {
      // If no song is playing, play the first song in the playlist
      playlistItems.children[0].click();
    }
  });

  // Handle previous button click
  prevButton.addEventListener('click', () => {
    if (currentTrack) {
      const currentIndex = Array.from(playlistItems.children).indexOf(currentTrack);
      const prevIndex = (currentIndex - 1 + playlistItems.children.length) % playlistItems.children.length;
      playlistItems.children[prevIndex].click();
    }
  });

  // Handle next button click
  nextButton.addEventListener('click', () => {
    if (currentTrack) {
      const currentIndex = Array.from(playlistItems.children).indexOf(currentTrack);
      const nextIndex = (currentIndex + 1) % playlistItems.children.length;
      playlistItems.children[nextIndex].click();
    }
  });

  // Handle file selection
  addFileInput.addEventListener('change', async (event) => {
    const files = event.target.files;
    for (const file of files) {
      const filePath = file.path;
      if (filePath) {
        jsmediatags.read(filePath, {
          onSuccess: function(tag) {
            let artist = tag.tags.artist || 'Unknown Artist';
            if (artist.includes(';')) {
              artist = artist.split(';')[0].trim();
            }
            const title = tag.tags.title || filePath.split(/[\\/]/).pop().replace('.mp3', '');

            const tempAudio = new Audio(filePath);
            tempAudio.addEventListener('loadedmetadata', async () => {
              const duration = formatTime(tempAudio.duration);
              addPlaylistItem(artist, title, duration, filePath);
              fetchAlbumArt(artist, title);
            });
          },
          onError: function(error) {
            console.error('Error reading MP3 tags:', error);
            const fileName = filePath.split(/[\\/]/).pop();
            const title = fileName.replace('.mp3', '');
            let artist = 'Unknown Artist';
            if (artist.includes(';')) {
              artist = artist.split(';')[0].trim();
            }

            const tempAudio = new Audio(filePath);
            tempAudio.addEventListener('loadedmetadata', async () => {
              const duration = formatTime(tempAudio.duration);
              addPlaylistItem(artist, title, duration, filePath);
              fetchAlbumArt(artist, title);
            });
          }
        });
      }
    }
  });

  // Function to format time (seconds to MM:SS)
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  // Update track time and time bar as audio plays
  audio.addEventListener('timeupdate', () => {
    trackTimeDisplay.textContent = formatTime(audio.currentTime);
    const progress = (audio.currentTime / audio.duration) * 100;
    timeBar.value = progress;
  });

  // Reset time bar and display when song ends
  audio.addEventListener('ended', () => {
    trackTimeDisplay.textContent = '0:00';
    timeBar.value = 0;
    isPlaying = false;
    playPauseButton.textContent = 'Play';
    if (currentTrack) {
      currentTrack.classList.remove('playing');
      // Automatically play the next song
      const currentIndex = Array.from(playlistItems.children).indexOf(currentTrack);
      const nextIndex = (currentIndex + 1) % playlistItems.children.length;
      if (playlistItems.children.length > 0) {
        playlistItems.children[nextIndex].click();
      } else {
        currentTrack = null;
        document.querySelector('.track-name').textContent = 'Track name - Artist name';
        albumArtImage.src = 'Default-Album.png'; // Set default album art
      }
    }
  });

  // Seek functionality for time bar
  timeBar.addEventListener('input', () => {
    const seekTime = (timeBar.value / 100) * audio.duration;
    audio.currentTime = seekTime;
  });

  // Function to add a new playlist item
  function addPlaylistItem(artist, title, duration, filePath) {
    // Check for duplicates
    const existingItems = Array.from(playlistItems.children);
    const isDuplicate = existingItems.some(item => item.dataset.filePath === filePath);

    if (isDuplicate) {
      console.log('Song already in playlist:', filePath);
      return; // Do not add duplicate
    }

    const newItem = document.createElement('div');
    newItem.classList.add('playlist-item');
    newItem.dataset.filePath = filePath; // Store file path as data attribute
    newItem.innerHTML = `
      <button class="del-btn">Del</button>
      <span class="artist-name">${artist}</span>
      <span class="track-title">${title}</span>
      <span class="track-duration">${duration}</span>
    `;
    playlistItems.appendChild(newItem);
    masterPlaylist.push(newItem); // Add to master playlist
    savePlaylist();

    // Add event listener for playing the track
    newItem.addEventListener('click', () => {
      if (currentTrack) {
        currentTrack.classList.remove('playing');
      }
      currentTrack = newItem;
      currentTrack.classList.add('playing');
      audio.src = filePath;
      audio.play();
      isPlaying = true;
      playPauseButton.textContent = 'Pause';
      document.querySelector('.track-name').textContent = `${title} - ${artist}`;
      fetchAlbumArt(artist, title);
      playlistSearchInput.value = ''; // Clear search input
      playlistSortSelect.value = 'default'; // Reset sort dropdown
      filterAndSortPlaylist(); // Re-filter and sort after playing a new item
    });

    newItem.querySelector('.del-btn').addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent playing when deleting
      const itemToRemove = event.target.closest('.playlist-item');
      const index = masterPlaylist.indexOf(itemToRemove);
      if (index > -1) {
        masterPlaylist.splice(index, 1); // Remove from master playlist
      }
      itemToRemove.remove();
      savePlaylist();
      if (currentTrack === itemToRemove) {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        playPauseButton.textContent = 'Play';
        document.querySelector('.track-name').textContent = 'Track name - Artist name';
        albumArtImage.src = 'Default-Album.png'; // Set default album art
      }
      currentTrack = null;
      document.querySelector('.track-name').textContent = 'Track name - Artist name';
      albumArtImage.src = 'Default-Album.png'; // Set default album art
      playlistSearchInput.value = ''; // Clear search input
      playlistSortSelect.value = 'default'; // Reset sort dropdown
      filterAndSortPlaylist(); // Re-filter and sort after deleting an item
    });
  }

  async function fetchAlbumArt(artist, title) {
    try {
      const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artist + ' ' + title)}`);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const album = data.data[0].album;
        if (album && album.cover_xl) {
          albumArtImage.src = album.cover_xl;
        } else {
          albumArtImage.src = ''; // Clear if no cover found
        }
      } else {
        albumArtImage.src = 'Default-Album.png'; // Set default album art
      }
    } catch (error) {
      console.error('Error fetching album art:', error);
      albumArtImage.src = ''; // Clear on error
    }
  }

  function savePlaylist() {
    const playlist = [];
    playlistItems.querySelectorAll('.playlist-item').forEach(item => {
      playlist.push({
        artist: item.querySelector('.artist-name').textContent,
        title: item.querySelector('.track-title').textContent,
        duration: item.querySelector('.track-duration').textContent,
        filePath: item.dataset.filePath
      });
    });
    localStorage.setItem('playlist', JSON.stringify(playlist));
  }

  function loadPlaylist() {
    const savedPlaylist = localStorage.getItem('playlist');
    if (savedPlaylist) {
      const playlist = JSON.parse(savedPlaylist);
      playlist.forEach(item => {
        // Directly add to DOM and masterPlaylist without calling addPlaylistItem
        // to avoid re-triggering filterAndSortPlaylist during initial load
        const newItem = document.createElement('div');
        newItem.classList.add('playlist-item');
        newItem.dataset.filePath = item.filePath; // Store file path as data attribute
        newItem.innerHTML = `
          <button class="del-btn">Del</button>
          <span class="artist-name">${item.artist}</span>
          <span class="track-title">${item.title}</span>
          <span class="track-duration">${item.duration}</span>
        `;
        playlistItems.appendChild(newItem);
        masterPlaylist.push(newItem); // Add to master playlist

        // Re-add event listeners for loaded items
        newItem.addEventListener('click', () => {
          if (currentTrack) {
            currentTrack.classList.remove('playing');
          }
          currentTrack = newItem;
          currentTrack.classList.add('playing');
          audio.src = item.filePath;
          audio.play();
          isPlaying = true;
          playPauseButton.textContent = 'Pause';
          document.querySelector('.track-name').textContent = `${item.title} - ${item.artist}`;
          fetchAlbumArt(item.artist, item.title);
          playlistSearchInput.value = ''; // Clear search input
          playlistSortSelect.value = 'default'; // Reset sort dropdown
          filterAndSortPlaylist(); // Re-filter and sort after playing a new item
        });

        newItem.querySelector('.del-btn').addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent playing when deleting
          const itemToRemove = event.target.closest('.playlist-item');
          const index = masterPlaylist.indexOf(itemToRemove);
          if (index > -1) {
            masterPlaylist.splice(index, 1); // Remove from master playlist
          }
          itemToRemove.remove();
          savePlaylist();
          if (currentTrack === itemToRemove) {
            audio.pause();
            audio.currentTime = 0;
            isPlaying = false;
            playPauseButton.textContent = 'Play';
            document.querySelector('.track-name').textContent = 'Track name - Artist name';
            albumArtImage.src = 'Default-Album.png'; // Set default album art
          }
          currentTrack = null;
          document.querySelector('.track-name').textContent = 'Track name - Artist name';
          albumArtImage.src = 'Default-Album.png'; // Set default album art
          playlistSearchInput.value = ''; // Clear search input
          playlistSortSelect.value = 'default'; // Reset sort dropdown
          filterAndSortPlaylist(); // Re-filter and sort after deleting an item
        });
      });
    }
  }

  const playlistSearchInput = document.getElementById('playlist-search');
    const playlistSortSelect = document.getElementById('playlist-sort');

    // Function to filter and sort playlist items
    function filterAndSortPlaylist() {
      let itemsToDisplay = [...masterPlaylist]; // Start with a copy of the master list
      const searchTerm = playlistSearchInput.value.toLowerCase();
      const sortBy = playlistSortSelect.value;

      // Filter
      if (searchTerm) {
        itemsToDisplay = itemsToDisplay.filter(item => {
          const artist = item.querySelector('.artist-name').textContent.toLowerCase();
          const title = item.querySelector('.track-title').textContent.toLowerCase();
          return artist.includes(searchTerm) || title.includes(searchTerm);
        });
      }

      // Sort
      if (sortBy !== 'default') {
        itemsToDisplay.sort((a, b) => {
          const artistA = a.querySelector('.artist-name').textContent.toLowerCase();
          const titleA = a.querySelector('.track-title').textContent.toLowerCase();
          const artistB = b.querySelector('.artist-name').textContent.toLowerCase();
          const titleB = b.querySelector('.track-title').textContent.toLowerCase();

          if (sortBy === 'artist-asc') {
            return artistA.localeCompare(artistB);
          } else if (sortBy === 'artist-desc') {
            return artistB.localeCompare(artistA);
          } else if (sortBy === 'title-asc') {
            return titleA.localeCompare(titleB);
          } else if (sortBy === 'title-desc') {
            return titleB.localeCompare(titleA);
          }
          return 0; // Should not reach here if sortBy is not 'default'
        });
      }

      // Clear current playlist and append sorted/filtered items
      playlistItems.innerHTML = '';
      itemsToDisplay.forEach(item => playlistItems.appendChild(item));
    }

    // Event listeners for search and sort
    playlistSearchInput.addEventListener('input', filterAndSortPlaylist);
    playlistSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && playlistSearchInput.value === '') {
        playlistSortSelect.value = 'default';
        filterAndSortPlaylist();
      }
    });
    playlistSortSelect.addEventListener('change', filterAndSortPlaylist);

    loadPlaylist();

    // No longer need to override addPlaylistItem as masterPlaylist handles the source of truth
    // and filterAndSortPlaylist is called after adding items.
});