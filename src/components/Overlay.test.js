import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Overlay from './Overlay';

test('renders overlay with dialog semantics and closes via Escape', () => {
  const onClose = jest.fn();
  render(<Overlay open={true} onClose={onClose} title="Test Overlay" />);
  expect(screen.getByRole('dialog', { name: 'Test Overlay' })).toBeInTheDocument();
  expect(screen.getByRole('dialog').style.zIndex).toBe('2000');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('close on backdrop click but not on inner click', () => {
  const onClose = jest.fn();
  render(<Overlay open={true} onClose={onClose} title="Test Overlay" />);
  fireEvent.click(screen.getByRole('dialog'));
  expect(onClose).toHaveBeenCalledTimes(1);
  onClose.mockClear();
  fireEvent.click(screen.getByText('×'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('focus management sets focus to close button', () => {
  const onClose = jest.fn();
  render(<Overlay open={true} onClose={onClose} title="Test Overlay" />);
  expect(screen.getByRole('button', { name: 'Close overlay' })).toHaveFocus();
});