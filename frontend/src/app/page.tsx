"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Avatar from "@/components/Avatar";
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
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-center items-center gap-8 p-4">
            {authenticated && user && (
                <Avatar src={user?.picture} alt="avatar" size={128} />
            )}
            <h1 className="text-5xl font-semibold">good morning!</h1>
            {authenticated && user ? (
                <div className="flex flex-col items-center gap-4">
                    {partner ? (
                        <Card className="min-w-xs">
                            <CardContent className="flex flex-col items-center gap-4">
                                <p className="text-xl font-semibold">
                                    Your Partner
                                </p>
                                <div className="flex flex-row items-center gap-4">
                                    <Avatar
                                        src={partner.picture}
                                        alt="partner avatar"
                                    />
                                    <p className="text-2xl font-semibold">
                                        {partner.username}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="min-w-xs">
                            <CardContent className="flex flex-col items-center gap-4">
                                <p className="text-xl font-semibold">
                                    Pair with Partner
                                </p>
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
                    <Link href="/me" className="cursor-pointer">
                        <Button variant="outline">Me</Button>
                    </Link>
                </div>
            ) : (
                <Button
                    onClick={loginWithGoogle}
                    variant="outline"
                >
                    Login with Google
                </Button>
            )}
        </div>
    );
}
