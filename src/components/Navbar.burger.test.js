import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from './Navbar';

test('burger menu shows Overview, Management, Admin sections and navigates', () => {
  const onNavigate = jest.fn();
  const user = { firstName: 'A', lastName: 'B', role: 'admin' };
  render(<Navbar user={user} currentView={'dashboard'} onNavigate={onNavigate} onLogout={() => {}} onGlobalSearch={() => {}} onBrandClick={() => {}} />);
  const burger = screen.getByRole('button', { name: /open menu/i });
  fireEvent.click(burger);
  expect(screen.getByRole('menu', { name: 'Main menu' })).toBeInTheDocument();
  expect(screen.getByRole('menu', { name: 'Main menu' }).style.zIndex).toBe('1500');
  expect(screen.getByText('🗺️ Overview')).toBeInTheDocument();
  expect(screen.getByText('🛠️ Management')).toBeInTheDocument();
  expect(screen.getByText('🛡️ Admin')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: /Analytics/i }));
  expect(onNavigate).toHaveBeenCalledWith('analytics');
});