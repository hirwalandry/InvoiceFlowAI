import React from 'react';
import { twMerge } from 'tailwind-merge';

type Variant = 'primary' | 'secondary';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
  'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-ink-400/40 disabled:text-white',
  secondary:
  'border border-line bg-white text-ink-800 hover:bg-canvas hover:border-ink-400/60 disabled:text-ink-400'
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm'
};

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        variants[variant],
        sizes[size],
        className
      )}
      {...props} />);


}