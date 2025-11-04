import React from 'react';

interface SpotifyPlayerProps {
  trackId: string;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ trackId }) => {
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;

  return (
    <iframe
      key={trackId}
      src={embedUrl}
      width="100%"
      height="152"
      allowFullScreen={false}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="rounded-xl shadow-lg border-0"
    ></iframe>
  );
};

export default SpotifyPlayer;
