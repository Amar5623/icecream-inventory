// icecream-inventory/src/app/components/DashboardNavbar.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Package,
  Boxes,
  UserCircle,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
} from "lucide-react";

export default function DashboardNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/stocks", label: "Stocks", icon: Boxes },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/billing", label: "Billing", icon: FileText },
    { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
    { href: "/dashboard/sales", label: "Sales", icon: BarChart3 },
  ];

  return (
    <header className="bg-blue-600 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 hover:opacity-90 transition"
        >
          <Image
            src="/logo.png"
            alt="Logo"
            width={36}
            height={36}
            className="rounded-full border border-white shadow"
            priority
          />
          <span className="font-semibold text-lg text-white">
            IceCream Inventory
          </span>
        </Link>

        {/* NAVIGATION — Single Line, More Spacing, Responsive */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-white text-[0.92rem] ml-4">

          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition
                ${
                  pathname === href
                    ? "bg-white text-blue-700 shadow"
                    : "hover:bg-blue-500/30 hover:text-yellow-300"
                }`}
            >
              <Icon size={17} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}

        </nav>

        {/* Profile */}
        <Link
          href="/dashboard/profile"
          className={`p-1.5 rounded-full transition ${
            pathname === "/dashboard/profile"
              ? "bg-white"
              : "hover:bg-blue-500/30"
          }`}
        >
          <UserCircle
            size={32}
            className={
              pathname === "/dashboard/profile"
                ? "text-blue-700"
                : "text-white"
            }
          />
        </Link>
      </div>

      {/* MOBILE NAV — Scrollable, Clean */}
      <div className="md:hidden bg-blue-700 px-3 py-2 flex overflow-x-auto gap-4 text-sm text-white no-scrollbar">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap px-4 py-1.5 rounded-md transition
              ${
                pathname === href
                  ? "bg-white text-blue-700"
                  : "hover:bg-blue-500/40 hover:text-yellow-300"
              }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Hide mobile scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </header>
  );
}
