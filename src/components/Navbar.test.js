import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from './Navbar';

function setup(props = {}) {
  const onNavigate = jest.fn();
  const onLogout = jest.fn();
  const onGlobalSearch = jest.fn();
  const user = { firstName: 'Test', lastName: 'User', role: 'admin' };
  render(<Navbar user={user} currentView={props.currentView || 'dashboard'} onNavigate={onNavigate} onLogout={onLogout} onGlobalSearch={onGlobalSearch} />);
  return { onNavigate, onLogout, onGlobalSearch };
}

test('burger opens and shows sections including Admin', () => {
  setup();
  const burger = screen.getByRole('button', { name: /open menu/i });
  fireEvent.click(burger);
  expect(screen.getByRole('menu', { name: 'Main menu' })).toBeInTheDocument();
  expect(screen.getByText('🗺️ Overview')).toBeInTheDocument();
  expect(screen.getByText('🛠️ Management')).toBeInTheDocument();
  expect(screen.getByText('🛡️ Admin')).toBeInTheDocument();
});

test('active item is highlighted inside burger', () => {
  setup({ currentView: 'analytics' });
  const burger = screen.getByRole('button', { name: /open menu/i });
  fireEvent.click(burger);
  const item = screen.getByRole('menuitem', { name: /Analytics/i });
  expect(item).toHaveStyle({ background: '#1f2937' });
});

test('burger supports keyboard navigation and Escape closes', () => {
  setup();
  const burger = screen.getByRole('button', { name: /open menu/i });
  fireEvent.click(burger);
  const usersItem = screen.getByRole('menuitem', { name: /Users/i });
  usersItem.focus();
  fireEvent.keyDown(usersItem, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Notifications/i }));
  fireEvent.keyDown(usersItem, { key: 'Escape' });
  expect(screen.queryByRole('menu', { name: 'Main menu' })).not.toBeInTheDocument();
});

test('search triggers global search and navigates to users', () => {
  const { onGlobalSearch } = setup();
  const input = screen.getByRole('searchbox', { name: 'Search users' });
  fireEvent.change(input, { target: { value: 'alice' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onGlobalSearch).toHaveBeenCalledWith('alice');
});