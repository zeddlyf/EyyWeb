import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from './API';
import { reverseGeocode, toHumanAddress } from './geocoding';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom driver icon
const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" fill="#3B82F6"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Component to update map center when user location changes
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function MapResizer({ trigger }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 0);
  }, [trigger, map]);
  return null;
}

function Dashboard({ user, onLogout, onNavigateToAnalytics, onNavigateToUserManagement, onNavigateToFeedbackAdmin, onNavigateToNotifications }) {
  const [drivers, setDrivers] = useState([]);
  const [driverMap, setDriverMap] = useState({});
  const [lastSeen, setLastSeen] = useState({});
  const [userLocation, setUserLocation] = useState([13.6240, 123.1875]); // Default to Naga City
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const panelRef = useRef(null);
  const [userAddress, setUserAddress] = useState('');

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation([lat, lon]);
          try { const addr = await reverseGeocode(lat, lon); setUserAddress(addr); } catch {}
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Keep default location (Naga City)
        }
      );
    }
  }, []);

  // Fetch nearby drivers
  const fetchDrivers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const nearbyDrivers = await api.getNearbyDrivers(
        userLocation[0], 
        userLocation[1], 
        10000 // 10km radius
      );
      const filtered = (nearbyDrivers || []).filter(d => {
        const coords = d.location?.coordinates;
        return d.isAvailable === true && Array.isArray(coords) && coords.length === 2 && isFinite(coords[0]) && isFinite(coords[1]);
      });
      setDrivers(filtered);
      setError('');
    } catch (err) {
      setError('Failed to load drivers: ' + err.message);
      console.error('Error fetching drivers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 30000);
    return () => clearInterval(interval);
  }, [fetchDrivers]);

  useEffect(() => {
    const count = drivers.filter(d => {
      const seen = lastSeen[d._id];
      return seen && Date.now() - seen < 30000;
    }).length;
    window.dispatchEvent(new CustomEvent('dashboard:onlineDriversCount', { detail: { count } }));
  }, [drivers, lastSeen]);

  // Socket: real-time driver updates
  useEffect(() => {
    const token = api.getToken();
    const socket = io(api.baseURL.replace('/api',''), {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      autoConnect: true,
      reconnection: true,
    });
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('driverLocationChanged', (payload) => {
      const { driverId, location, status, hasPassenger, rideId, timestamp } = payload;
      const valid = location && isFinite(location.latitude) && isFinite(location.longitude);
      // Only track available drivers, drop on-trip
      const isAvailable = status === 'available' && valid;
      setLastSeen((prev) => ({ ...prev, [driverId]: Date.now() }));
      setDriverMap((prev) => ({
        ...prev,
        [driverId]: isAvailable ? { driverId, location, status, hasPassenger, rideId, timestamp } : undefined
      }));
      setDrivers((prev) => {
        const existingIdx = prev.findIndex(d => d._id === driverId);
        if (!isAvailable) {
          // Remove if present
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated.splice(existingIdx, 1);
            return updated;
          }
          return prev;
        }
        // Upsert available driver
        const up = {
          _id: driverId,
          location: { type: 'Point', coordinates: [location.longitude, location.latitude] },
          isAvailable: true
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...up };
          return updated;
        }
        return [...prev, up];
      });
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const h = panelRef.current ? panelRef.current.offsetHeight : 0;
      setBottomPanelHeight(h || 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selectedDriver]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={userLocation}
          zoom={13}
          style={{ height: selectedDriver ? `calc(100% - ${bottomPanelHeight}px)` : '100%', width: '100%', transition: 'height 150ms ease' }}
        >
          <MapUpdater center={userLocation} />
          <MapResizer trigger={`${selectedDriver ? bottomPanelHeight : 0}`} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Driver markers (filter ghosts: must have recent lastSeen within 30s) */}
          {drivers.filter(d => {
            const seen = lastSeen[d._id];
            return seen && Date.now() - seen < 30000; // 30s freshness window
          }).map((driver) => (
            <Marker
              key={driver._id}
              position={[driver.location.coordinates[1], driver.location.coordinates[0]]}
              icon={driverIcon}
              eventHandlers={{
                click: () => {
                  const info = driverMap[driver._id];
                  setSelectedDriver({
                    _id: driver._id,
                    firstName: driver.firstName,
                    lastName: driver.lastName,
                    phoneNumber: driver.phoneNumber,
                    rating: driver.rating,
                    status: info?.status || (driver.isAvailable ? 'available' : 'on-trip'),
                    coords: driver.location.coordinates,
                  });
                }
              }}
            >
              <Popup>
                <div>
                  <strong>Driver: {driver.firstName} {driver.lastName}</strong><br />
                  <div style={{ margin: '8px 0' }}>
                    <div>📞 {driver.phoneNumber}</div>
                    <div>⭐ Rating: {driver.rating ? driver.rating.toFixed(1) : 'No rating'}</div>
                    <div>🚗 Status: {driverMap[driver._id]?.status || (driver.isAvailable ? 'available' : 'on-trip')}</div>
                    <div>🪪 License: {driver.licenseNumber || '—'}</div>
                    <div>👤 Passenger: {driverMap[driver._id]?.hasPassenger ? 'With passenger' : 'No passenger'}</div>
                    <div>📍 Coords: {driver.location.coordinates[1].toFixed(5)}, {driver.location.coordinates[0].toFixed(5)}</div>
                    {driverMap[driver._id]?.rideId && (
                      <div style={{ marginTop: '6px' }}>
                        <button
                          onClick={async () => {
                            try {
                              const ride = await api.getRideById(driverMap[driver._id].rideId);
                              alert(`Ride ${ride._id}\nStatus: ${ride.status}\nFrom: ${ride.pickupLocation.address}\nTo: ${ride.dropoffLocation.address}`);
                            } catch (err) {
                              console.error('Failed to fetch ride details', err);
                            }
                          }}
                          style={{ padding: '6px 8px', background: '#1f2937', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          View Trip Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Loading overlay or No drivers message */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(255,255,255,0.9)',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #3B82F6',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading drivers...
            </div>
          </div>
        )}
        {!isLoading && drivers.filter(d => {
          const seen = lastSeen[d._id];
          return seen && Date.now() - seen < 30000;
        }).length === 0 && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: '#fff',
            color: '#374151',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            No available drivers right now.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#fef2f2',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            maxWidth: '300px'
          }}>
            {error}
          </div>
        )}

      {/* Driver count overlay (available + fresh) */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(255,255,255,0.9)',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Your Location</div>
        <div style={{ fontSize: '12px', color: '#374151', marginBottom: 6, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toHumanAddress(userAddress, userLocation[0], userLocation[1])}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Available Drivers</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
          {isLoading ? '...' : drivers.filter(d => {
            const seen = lastSeen[d._id];
            return seen && Date.now() - seen < 30000;
          }).length}
        </div>
      </div>

      {/* Socket status */}
      {!socketConnected && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: '#fff7ed',
          color: '#9a3412',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid #fdba74'
        }}>
          Real-time connection lost. Trying to reconnect...
        </div>
      )}

      {/* Selected driver bottom panel */}
      {selectedDriver && (
        <div ref={panelRef} role="region" aria-label="Selected driver" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1500, background: 'rgba(17,24,39,0.95)', color: 'white', borderTop: '1px solid #374151', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeIn 120ms ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 700 }}>{selectedDriver.firstName} {selectedDriver.lastName}</div>
            <div style={{ color: '#9ca3af' }}>📞 {selectedDriver.phoneNumber}</div>
            <div style={{ color: '#9ca3af' }}>⭐ {selectedDriver.rating ? selectedDriver.rating.toFixed(1) : 'No rating'}</div>
            <div style={{ color: selectedDriver.status === 'available' ? '#10b981' : '#f59e0b' }}>{selectedDriver.status}</div>
            <div style={{ color: '#9ca3af' }}>📍 {selectedDriver.coords[1].toFixed(5)}, {selectedDriver.coords[0].toFixed(5)}</div>
          </div>
          <button onClick={() => setSelectedDriver(null)} style={{ padding: '6px 10px', background: '#ef4444', color: 'white', borderRadius: 6 }}>Close</button>
        </div>
      )}
    </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}

export default Dashboard;
