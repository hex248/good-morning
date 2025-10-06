"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkAuth, getUserData, editUsername, type User } from "@/lib/api";

export default function MePage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [newUsername, setNewUsername] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
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
            setLoading(false);
        };
        initAuth();
    }, [router]);

    const handleEditUsername = async () => {
        if (newUsername.trim()) {
            const result = await editUsername(newUsername);
            setMessage(result.message);
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
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    {user.picture && (
                        <img
                            src={user.picture}
                            alt="avatar"
                            className="w-24 h-24 rounded-full border-2 border-border"
                        />
                    )}
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
                    <p>Email: {user.email}</p>
                </CardContent>
            </Card>
            {partner && (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Your Partner</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <img
                            src={partner.picture}
                            alt="partner avatar"
                            className="w-24 h-24 rounded-full border-2 border-border"
                        />
                        <p className="text-2xl font-semibold">
                            {partner.username}
                        </p>
                    </CardContent>
                </Card>
            )}
            {message && <p>{message}</p>}
            <div className="flex gap-2 justify-center w-full">
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
