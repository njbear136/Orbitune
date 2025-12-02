import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, SkipBack, SkipForward, FileText } from 'lucide-react';

function App() {
  const [songs, setSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [floatingLyrics, setFloatingLyrics] = useState([]);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyricsMenu, setShowLyricsMenu] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  
  // REFS
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const lyricsInputRef = useRef(null);

  // EXTRACT ALBUM ART
  const extractAlbumArt = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target.result;
          const view = new DataView(arrayBuffer);
          
          if (view.byteLength < 10) {
            resolve(null);
            return;
          }
          
          const id3Header = String.fromCharCode(
            view.getUint8(0), 
            view.getUint8(1), 
            view.getUint8(2)
          );
          
          if (id3Header !== 'ID3') {
            resolve(null);
            return;
          }
          
          const bytes = new Uint8Array(arrayBuffer);
          let apicIndex = -1;
          
          for (let i = 0; i < Math.min(bytes.length - 4, 50000); i++) {
            if (bytes[i] === 0x41 && bytes[i+1] === 0x50 && 
                bytes[i+2] === 0x49 && bytes[i+3] === 0x43) {
              apicIndex = i;
              break;
            }
          }
          
          if (apicIndex > -1) {
            const searchStart = apicIndex + 10;
            
            for (let i = searchStart; i < Math.min(bytes.length - 4, searchStart + 1000); i++) {
              if (bytes[i] === 0xFF && bytes[i+1] === 0xD8) {
                for (let j = i + 2; j < Math.min(bytes.length - 1, i + 500000); j++) {
                  if (bytes[j] === 0xFF && bytes[j+1] === 0xD9) {
                    const imageData = bytes.slice(i, j + 2);
                    const blob = new Blob([imageData], { type: 'image/jpeg' });
                    resolve(URL.createObjectURL(blob));
                    return;
                  }
                }
              }
              if (bytes[i] === 0x89 && bytes[i+1] === 0x50 && 
                  bytes[i+2] === 0x4E && bytes[i+3] === 0x47) {
                const imageData = bytes.slice(i, Math.min(i + 500000, bytes.length));
                const blob = new Blob([imageData], { type: 'image/png' });
                resolve(URL.createObjectURL(blob));
                return;
              }
            }
          }
          
          resolve(null);
        } catch (error) {
          console.error('Error extracting album art:', error);
          resolve(null);
        }
      };
      
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    });
  };

  // HANDLE FILE UPLOAD
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsLoading(true);
    
    const wasPlaying = isPlaying;
    const currentPlaybackTime = audioRef.current?.currentTime || 0;
    const currentAudioSrc = audioRef.current?.src;
    
    const processedSongs = await Promise.all(
      files.map(async (file) => {
        const coverArt = await extractAlbumArt(file);
        
        return {
          name: file.name.replace(/\.(mp3|wav|m4a|ogg|flac)$/i, ''),
          file: file,
          url: URL.createObjectURL(file),
          coverArt: coverArt,
          lyrics: []
        };
      })
    );
    
    const newSongs = [...songs, ...processedSongs];
    setSongs(newSongs);
    
    if (audioRef.current && currentAudioSrc) {
      audioRef.current.src = currentAudioSrc;
      audioRef.current.currentTime = currentPlaybackTime;
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.log('Play error:', err));
      }
    }
    
    if (songs.length === 0 && newSongs.length > 0) {
      setCurrentSongIndex(0);
    }
    
    setIsLoading(false);
  };

  // HANDLE LYRICS UPLOAD
  const handleLyricsUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    const wasPlaying = isPlaying;
    const currentPlaybackTime = audioRef.current?.currentTime || 0;
    const currentAudioSrc = audioRef.current?.src;
    
    for (const file of files) {
      const lyricsFileName = file.name.replace('.txt', '');
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target.result;
        const lyricsArray = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        setSongs(prevSongs => 
          prevSongs.map(song => {
            if (song.name === lyricsFileName || 
                song.name.includes(lyricsFileName) || 
                lyricsFileName.includes(song.name)) {
              return { ...song, lyrics: lyricsArray };
            }
            return song;
          })
        );
        
        if (audioRef.current && currentAudioSrc) {
          audioRef.current.src = currentAudioSrc;
          audioRef.current.currentTime = currentPlaybackTime;
          if (wasPlaying) {
            audioRef.current.play().catch(err => console.log('Play error:', err));
          }
        }
      };
      
      reader.readAsText(file);
    }
  };

  // TOGGLE PLAY/PAUSE
  const togglePlay = () => {
    if (songs.length === 0) {
      alert('Please upload a song first!');
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Play error:', err);
          alert('Unable to play. Try again!');
        });
    }
  };

  // NEXT SONG
  const nextSong = () => {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
  };

  // PREVIOUS SONG
  const prevSong = () => {
    if (songs.length === 0) return;
    const prevIndex = currentSongIndex === 0 ? songs.length - 1 : currentSongIndex - 1;
    setCurrentSongIndex(prevIndex);
  };

  // SELECT SONG FROM QUEUE
  const selectSong = (index) => {
    setCurrentSongIndex(index);
    setShowQueue(false);
  };

  // SETUP AUDIO LISTENERS
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      if (songs[currentSongIndex]?.lyrics.length > 0) {
        const currentLyrics = songs[currentSongIndex].lyrics;
        const lyricIndex = Math.floor(audio.currentTime / 4) % currentLyrics.length;
        
        if (lyricIndex !== currentLyricIndex) {
          setCurrentLyricIndex(lyricIndex);
          
          const newLyric = {
            id: Date.now() + Math.random(),
            text: currentLyrics[lyricIndex],
            startTime: Date.now()
          };
          setFloatingLyrics(prev => [...prev, newLyric]);
          
          setTimeout(() => {
            setFloatingLyrics(prev => prev.filter(l => l.id !== newLyric.id));
          }, 6000);
        }
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      nextSong();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSongIndex, songs, currentLyricIndex]);

  // HANDLE SONG CHANGES
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || songs.length === 0) return;
    
    const currentSong = songs[currentSongIndex];
    if (!currentSong) return;
    
    setCurrentTime(0);
    setDuration(0);
    setCurrentLyricIndex(0);
    
    audio.src = currentSong.url;
    audio.load();
    
    setTimeout(() => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Auto-play error:', err);
          setIsPlaying(false);
        });
    }, 200);
  }, [currentSongIndex, songs]);

  // VOLUME CONTROL
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // FORMAT TIME
  const formatTime = (time) => {
    if (isNaN(time) || time === 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSong = songs[currentSongIndex];

  return (
    <div className="app-container">
      
      <div className="ocean-wave"></div>

      {showInstructions && (
        <div className="instructions-box">
          <button onClick={() => setShowInstructions(false)} className="close-instructions">✕</button>
          <h3>Quick Guide</h3>
          <p>1. Upload songs → 2. Upload lyrics (name files same as songs) → 3. Play & enjoy! Use Queue to select songs.</p>
        </div>
      )}

      {floatingLyrics.map(lyric => (
        <div key={lyric.id} className="floating-lyric">
          {lyric.text}
        </div>
      ))}

      <div className="player-wrapper">
        
        <div className="spotlight"></div>
        
        <div className="vinyl-container">
          <div className="vinyl-record">
            
            <div className={`record-disc ${isPlaying ? 'spinning' : ''}`}>
              
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="groove"
                  style={{
                    top: `${12 + i * 6}%`,
                    left: `${12 + i * 6}%`,
                    right: `${12 + i * 6}%`,
                    bottom: `${12 + i * 6}%`,
                  }}
                ></div>
              ))}
              
              <div className="center-label">
                {currentSong?.coverArt ? (
                  <img 
                    src={currentSong.coverArt} 
                    alt="Album Cover" 
                    className="album-cover-img"
                  />
                ) : (
                  <div className="album-cover-placeholder">🎵</div>
                )}
              </div>
            </div>
            
            <div className={`tonearm ${isPlaying ? 'playing' : ''}`}>
              <div className="tonearm-body">
                <div className="tonearm-needle"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="controls-card">
          
          <div className="song-title-section">
            <h2 className="song-title">
              {currentSong ? currentSong.name : 'No Song Selected'}
            </h2>
            <p className="player-subtitle">Upload your music library and enjoy them being played</p>
          </div>

          {currentSong && (
            <div className="progress-section">
              <div 
                className="progress-bar-container"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  const newTime = percent * duration;
                  audioRef.current.currentTime = newTime;
                }}
              >
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          <div className="controls-buttons">
            <button onClick={prevSong} disabled={songs.length === 0} className="control-btn">
              <SkipBack size={24} />
            </button>
            
            <button onClick={togglePlay} disabled={songs.length === 0 || isLoading} className="control-btn play-btn">
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>
            
            <button onClick={nextSong} disabled={songs.length === 0} className="control-btn">
              <SkipForward size={24} />
            </button>
          </div>

          {currentSong && (
            <div className="volume-section">
              <label className="volume-label">
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
            </div>
          )}

          <div className="upload-section">
            <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            <input ref={lyricsInputRef} type="file" accept=".txt" multiple onChange={handleLyricsUpload} style={{ display: 'none' }} />
            
            <div className="upload-buttons">
              <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="upload-btn">
                <Upload size={20} />
                {isLoading ? 'Loading...' : 'Upload Songs'}
              </button>
              
              <button onClick={() => lyricsInputRef.current?.click()} className="upload-btn lyrics-btn">
                <FileText size={20} />
                Upload Lyrics
              </button>

              <button onClick={() => setShowQueue(!showQueue)} className="upload-btn queue-btn">
                Queue ({songs.length})
              </button>

              <button onClick={() => setShowLyricsMenu(!showLyricsMenu)} className="upload-btn lyrics-menu-btn">
                Lyrics Files
              </button>
            </div>
            
            {songs.length > 0 && (
              <p className="song-count">
                {songs.length} song{songs.length > 1 ? 's' : ''} in library
              </p>
            )}
          </div>
        </div>
      </div>

      {showQueue && (
        <div className="queue-menu">
          <div className="queue-header">
            <h3>Queue</h3>
            <button onClick={() => setShowQueue(false)} className="close-btn">✕</button>
          </div>
          <div className="queue-list">
            {songs.map((song, index) => (
              <div key={index} onClick={() => selectSong(index)} className={`queue-item ${index === currentSongIndex ? 'active' : ''}`}>
                <span className="queue-number">{index + 1}</span>
                <span className="queue-name">{song.name}</span>
                {index === currentSongIndex && <span className="playing-indicator">▶</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showLyricsMenu && (
        <div className="lyrics-menu">
          <div className="queue-header">
            <h3>Lyrics Files</h3>
            <button onClick={() => setShowLyricsMenu(false)} className="close-btn">✕</button>
          </div>
          <div className="queue-list">
            {songs.filter(song => song.lyrics.length > 0).map((song, index) => (
              <div key={index} className="queue-item">
                <span className="queue-name">{song.name}</span>
                <span className="lyrics-count">{song.lyrics.length} lines</span>
              </div>
            ))}
            {songs.filter(song => song.lyrics.length > 0).length === 0 && (
              <p className="no-lyrics">No lyrics uploaded yet</p>
            )}
          </div>
        </div>
      )}

      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}

export default App;