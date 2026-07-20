'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Show,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Library', href: '/' },
  { label: 'Add New', href: '/books/new' },
  { label: 'Pricing', href: '/subscriptions' },
];

const Navbar = () => {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <header className="fixed z-50 w-full bg-(--bg-primary)">
      <div className="wrapper navbar-height flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-0.5">
          <Image
            src="/assets/logo.png"
            alt="Bookified"
            width={42}
            height={26}
            priority
          />
          <span className="logo-text">Bookified</span>
        </Link>

        <nav className="flex w-fit items-center gap-7.5">
          {navItems.map(({ label, href }) => {
            const isActive =
              pathname === href ||
              (href !== '/' && pathname.startsWith(href));

            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'nav-link-base',
                  isActive
                    ? 'nav-link-active'
                    : 'text-black hover:opacity-70'
                )}
              >
                {label}
              </Link>
            );
          })}

          <div className="flex items-center gap-7.5">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <div className="nav-user-link flex items-center gap-2">
                <UserButton />

                {user?.firstName && (
                  <Link
                    href="/subscriptions"
                    className="nav-user-name"
                  >
                    {user.firstName}
                  </Link>
                )}
              </div>
            </Show>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;