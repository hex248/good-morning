"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Avatar from "@/components/Avatar";
import {
    checkAuth,
    getUserData,
    editUsername,
    subscribeToPush,
    unsubscribeFromPush,
    type User,
} from "@/lib/api";

export default function MePage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [newUsername, setNewUsername] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const authData = await checkAuth();
            if (!authData.authenticated) {
                router.push("/");
                return;
            }
            setAuthenticated(true);
            setUser(authData.user);
            setPartner(authData.partner);
            setNotificationsEnabled(
                authData.user?.notificationsEnabled || false
            );
            setLoading(false);
        };
        initAuth();
    }, [router]);

    const handleEditUsername = async () => {
        if (newUsername.trim()) {
            const result = await editUsername(newUsername);
            if (result.success) {
                const userData = await getUserData();
                setUser(userData.user);
                setNewUsername("");
                setEditMode(false);
            }
        }
    };

    const handleLogout = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/logout`;
    };

    const handleToggleNotifications = async () => {
        if (notificationsEnabled) {
            const result = await unsubscribeFromPush();
            if (result.success) {
                setNotificationsEnabled(false);
                setUser(user ? { ...user, notificationsEnabled: false } : null);
            }
        } else {
            const result = await subscribeToPush();
            if (result.success) {
                setNotificationsEnabled(true);
                setUser(user ? { ...user, notificationsEnabled: true } : null);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }

    if (!authenticated || !user) {
        return null; // will redirect
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-center items-center gap-4 p-4">
            <h1 className="text-4xl font-semibold">Me</h1>
            <Card className="min-w-sm">
                <CardContent className="flex flex-col items-center gap-4">
                    <p className="text-xl font-semibold">Your Profile</p>
                    <Avatar src={user.picture} alt="avatar" />
                    {editMode ? (
                        <>
                            <Input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="New username"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleEditUsername}>
                                    Save
                                </Button>
                                <Button
                                    onClick={() => setEditMode(false)}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-2xl font-semibold">
                                {user.username}
                            </p>
                            <Button
                                onClick={() => setEditMode(true)}
                                variant="outline"
                            >
                                Edit Username
                            </Button>
                        </>
                    )}
                    <p>
                        <strong>Email:</strong> {user.email}
                    </p>
                    <div className="flex items-center gap-2">
                        <span>Notifications:</span>
                        <Button
                            onClick={handleToggleNotifications}
                            variant={"outline"}
                        >
                            {notificationsEnabled ? "Enabled" : "Disabled"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            {partner && (
                <Card className="min-w-sm">
                    <CardContent className="flex flex-col items-center gap-4">
                        <p className="text-xl font-semibold">Your Partner</p>
                        <Avatar src={partner.picture} alt="partner avatar" />
                        <p className="text-2xl font-semibold">
                            {partner.username}
                        </p>
                    </CardContent>
                </Card>
            )}
            {message && <p>{message}</p>}
            <div className="flex gap-2 justify-center min-w-sm">
                <Link href="/" className="cursor-pointer">
                    <Button variant="outline">Back to Home</Button>
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                    Log Out
                </Button>
            </div>
        </div>
    );
}
