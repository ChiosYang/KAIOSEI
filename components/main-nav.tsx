"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, Settings, LogOut, CreditCard } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Logo } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "U";
}

export function MainNav() {
  const { data: session, status } = useSession();

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-x-4">
        <Link href="/" className="flex items-center">
          <Logo className="h-8 w-8 text-white" />
        </Link>
        <NavigationMenu>
          <NavigationMenuList>
            {session && (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/recommendations"
                      className={navigationMenuTriggerStyle()}
                    >
                      Recomand
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/games"
                      className={navigationMenuTriggerStyle()}
                    >
                      Games
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/dashboard"
                      className={navigationMenuTriggerStyle()}
                    >
                      Dashboard
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/notion"
                      className={navigationMenuTriggerStyle()}
                    >
                      Notion
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/config"
                      className={navigationMenuTriggerStyle()}
                    >
                      Config
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/chat" className={navigationMenuTriggerStyle()}>
                      Chat
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className="flex items-center gap-x-4">
        {status === "loading" ? (
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
        ) : session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full">
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all">
                  <AvatarImage
                    src={session.user?.image || undefined}
                    alt={session.user?.name || session.user?.email || "User"}
                  />
                  <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                    {getInitials(session.user?.name, session.user?.email)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session.user?.name || "用户"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  个人资料
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/config" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  设置
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  账单
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            登录
          </Link>
        )}
      </div>
    </div>
  );
}
