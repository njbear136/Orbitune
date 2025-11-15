import React, { useState, useRef } from 'react';

function App() {
  const [songs, setSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    const newSongs = files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    
    setSongs([...songs, ...newSongs]);
    
    if (songs.length === 0 && newSongs.length > 0) {
      setCurrentSongIndex(0);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (songs.length === 0) {
      alert('Please upload a song first!');
      return;
    }
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const currentSong = songs[currentSongIndex];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Music Player</h1>
        
        {currentSong && (
          <p style={styles.songName}>{currentSong.name}</p>
        )}
        
        <div style={styles.controls}>
          <button onClick={togglePlay} style={styles.playButton}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          style={styles.uploadButton}
        >
          Upload Songs
        </button>
        
        {songs.length > 0 && (
          <p style={styles.info}>
            {songs.length} song(s) loaded
          </p>
        )}
      </div>

      <audio
        ref={audioRef}
        src={currentSong?.url}
      />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#16213e',
    padding: '40px',
    borderRadius: '10px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    color: '#fff',
    marginBottom: '20px',
  },
  songName: {
    color: '#aaa',
    marginBottom: '30px',
  },
  controls: {
    marginBottom: '30px',
  },
  playButton: {
    padding: '15px 40px',
    fontSize: '18px',
    background: '#0f4c75',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  uploadButton: {
    padding: '10px 30px',
    background: '#3282b8',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  info: {
    color: '#888',
    marginTop: '20px',
    fontSize: '14px',
  }
};

export default App;