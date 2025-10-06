"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    loginWithGoogle,
    checkAuth,
    pairUser,
    getUserData,
    type User,
} from "@/lib/api";

export default function Home() {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [pairCode, setPairCode] = useState("");
    const [pairMessage, setPairMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const authData = await checkAuth();
            setAuthenticated(authData.authenticated);
            setUser(authData.user);
            setPartner(authData.partner);
            setLoading(false);
        };
        initAuth();
    }, []);

    const handlePair = async () => {
        const result = await pairUser(pairCode);
        setPairMessage(result.message);
        if (result.success) {
            const userData = await getUserData();
            setUser(userData.user);
            setPartner(userData.partner);
            setPairCode("");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-center items-center gap-12 p-4">
            <h1 className="text-5xl font-semibold">good morning!</h1>
            {authenticated && user ? (
                <div className="flex flex-col items-center gap-8">
                    <Card>
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
                            <p>Username: {user.username}</p>
                        </CardContent>
                    </Card>
                    {partner ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Partner</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <img
                                    src={partner.picture}
                                    alt="partner avatar"
                                    className="w-16 h-16 rounded-full border-2 border-border"
                                />
                                <p>Username: {partner.username}</p>
                                <p>Unique Code: {partner.uniqueCode}</p>
                                {/* Unpair button can be added later */}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pair with Partner</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <p>Your Unique Code: {user.uniqueCode}</p>
                                <Input
                                    type="text"
                                    value={pairCode}
                                    onChange={(e) =>
                                        setPairCode(e.target.value)
                                    }
                                    placeholder="Enter partner's unique code"
                                />
                                <Button onClick={handlePair}>Pair</Button>
                                {pairMessage && <p>{pairMessage}</p>}
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                <Button
                    onClick={loginWithGoogle}
                    className="text-2xl py-5 px-12"
                >
                    Login with Google
                </Button>
            )}
        </div>
    );
}
