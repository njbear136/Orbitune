App.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, SkipBack, SkipForward, FileText } from 'lucide-react';

function App() {
  // STATE
  const [songs, setSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState([]);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  
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
    
    const processedSongs = await Promise.all(
      files.map(async (file) => {
        const coverArt = await extractAlbumArt(file);
        
        return {
          name: file.name.replace(/\.(mp3|wav|m4a|ogg|flac)$/i, ''),
          file: file,
          url: URL.createObjectURL(file),
          coverArt: coverArt
        };
      })
    );
    
    const newSongs = [...songs, ...processedSongs];
    setSongs(newSongs);
    
    if (songs.length === 0 && newSongs.length > 0) {
      setCurrentSongIndex(0);
    }
    
    setIsLoading(false);
  };

  // HANDLE LYRICS UPLOAD
  const handleLyricsUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      const lyricsFileName = file.name.replace('.txt', '');
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target.result;
        const lyricsArray = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => `✨ ${line} ✨`);
        
        setSongs(prevSongs => 
          prevSongs.map(song => {
            if (song.name === lyricsFileName || 
                song.name.includes(lyricsFileName) || 
                lyricsFileName.includes(song.name)) {
              console.log(`Lyrics loaded for: ${song.name}`);
              return { ...song, lyrics: lyricsArray };
            }
            return song;
          })
        );
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
          alert('Unable to play. Try clicking play again!');
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

  // SETUP AUDIO LISTENERS
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
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
  }, []);

  // HANDLE SONG CHANGES
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || songs.length === 0) return;
    
    const currentSong = songs[currentSongIndex];
    if (!currentSong) return;
    
    setCurrentTime(0);
    setDuration(0);
    
    audio.src = currentSong.url;
    audio.load();
    
    if (isPlaying) {
      setTimeout(() => {
        audio.play().catch(err => {
          console.error('Auto-play error:', err);
          setIsPlaying(false);
        });
      }, 100);
    }
  }, [currentSongIndex, songs]);

  // VOLUME CONTROL
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // FLOATING LYRICS
  useEffect(() => {
    if (!isPlaying) return;

    const currentLyrics = songs[currentSongIndex]?.lyrics || defaultLyrics;

    const interval = setInterval(() => {
      const randomLyric = currentLyrics[Math.floor(Math.random() * currentLyrics.length)];
      const newLyric = {
        id: Date.now() + Math.random(),
        text: randomLyric,
        left: Math.random() * 70 + 15,
      };
      
      setLyrics(prev => [...prev, newLyric]);
      
      setTimeout(() => {
        setLyrics(prev => prev.filter(l => l.id !== newLyric.id));
      }, 6000);
    }, 2500);

    return () => clearInterval(interval);
  }, [isPlaying, currentSongIndex, songs]);

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
      
      {/* Ocean Wave Background */}
      <div className="ocean-wave"></div>

      {/* Floating Lyrics */}
      {lyrics.map(lyric => (
        <div
          key={lyric.id}
          className="floating-lyric"
          style={{ left: `${lyric.left}%` }}
        >
          {lyric.text}
        </div>
      ))}

      {/* Main Player */}
      <div className="player-wrapper">
        
        {/* Spotlight */}
        <div className="spotlight"></div>
        
        {/* Vinyl Record */}
        <div className="vinyl-container">
          <div className="vinyl-record">
            
            {/* Record Disc */}
            <div className={`record-disc ${isPlaying ? 'spinning' : ''}`}>
              
              {/* Grooves */}
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
              
              {/* Center Label */}
              <div className="center-label">
                {currentSong?.coverArt ? (
                  <img 
                    src={currentSong.coverArt} 
                    alt="Album Cover" 
                    className="album-cover"
                  />
                ) : (
                  <div className="album-placeholder">
                    {currentSong ? currentSong.name.slice(0, 30) : '🎵 Upload Music'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Tonearm */}
            <div className={`tonearm ${isPlaying ? 'playing' : ''}`}>
              <div className="tonearm-body">
                <div className="tonearm-needle"></div>
                <div className="tonearm-base"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Card */}
        <div className="controls-card">
          
          {/* Song Title */}
          <div className="song-title-section">
            <h2 className="song-title">
              {currentSong ? currentSong.name : 'No Song Selected'}
            </h2>
            <p className="player-subtitle">Oceanic Vinyl Player</p>
          </div>

          {/* Progress Bar */}
          {currentSong && (
            <div className="progress-section">
              <div className="progress-bar-container">
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

          {/* Control Buttons */}
          <div className="controls-buttons">
            <button
              onClick={prevSong}
              disabled={songs.length === 0}
              className="control-btn"
              aria-label="Previous"
            >
              <SkipBack size={24} />
            </button>
            
            <button
              onClick={togglePlay}
              disabled={songs.length === 0 || isLoading}
              className="control-btn play-btn"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>
            
            <button
              onClick={nextSong}
              disabled={songs.length === 0}
              className="control-btn"
              aria-label="Next"
            >
              <SkipForward size={24} />
            </button>
          </div>

          {/* Volume */}
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

          {/* Upload Buttons */}
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <input
              ref={lyricsInputRef}
              type="file"
              accept=".txt"
              multiple
              onChange={handleLyricsUpload}
              style={{ display: 'none' }}
            />
            
            <div className="upload-buttons">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="upload-btn"
              >
                <Upload size={20} />
                {isLoading ? 'Loading...' : 'Upload Songs'}
              </button>
              
              <button
                onClick={() => lyricsInputRef.current?.click()}
                className="upload-btn lyrics-btn"
              >
                <FileText size={20} />
                Upload Lyrics
              </button>
            </div>
            
            {songs.length > 0 && (
              <p className="song-count">
                {songs.length} song{songs.length > 1 ? 's' : ''} loaded • Playing #{currentSongIndex + 1}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Audio */}
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}

export default App;