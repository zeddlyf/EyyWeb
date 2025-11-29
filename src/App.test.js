import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
jest.mock('react-leaflet', () => ({ MapContainer: () => null, TileLayer: () => null, Marker: () => null, Popup: () => null, useMap: () => ({}) }));
import App from './App';

test('renders login screen by default', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
});
