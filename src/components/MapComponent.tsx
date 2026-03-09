import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet using CDN
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  center: { latitude: number; longitude: number } | null;
}

export default function MapComponent({ center }: MapComponentProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  const position: [number, number] = center 
    ? [center.latitude, center.longitude] 
    : defaultCenter;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
      <MapContainer 
        center={position} 
        zoom={center ? 15 : 5} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center && (
          <>
            <Marker position={position}>
              <Popup>
                <div className="font-sans">
                  <p className="font-bold">Your Current Location</p>
                  <p className="text-xs text-slate-500">ShieldGuide is monitoring this area.</p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={position}
              radius={500}
              pathOptions={{ fillColor: '#10b981', color: '#10b981', fillOpacity: 0.1 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
