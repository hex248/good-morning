"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Avatar from "@/components/Avatar";
import {
    loginWithGoogle,
    checkAuth,
    pairUser,
    getUserData,
    getNotice,
    type User,
} from "@/lib/api";
import Image from "next/image";
import { Plus } from "lucide-react";

export default function Home() {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [notice, setNotice] = useState<any | null>(null);
    const [hasNotice, setHasNotice] = useState(false);
    const [alreadySent, setAlreadySent] = useState(false);
    const [pairCode, setPairCode] = useState("");
    const [pairMessage, setPairMessage] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];

        const initAuth = async () => {
            const authData = await checkAuth();
            setAuthenticated(authData.authenticated);
            setUser(authData.user);
            setPartner(authData.partner);
            if (authData.authenticated && authData.user) {
                const noticeData = await getNotice();
                setNotice(noticeData.notice);
                setHasNotice(noticeData.notice !== null);

                const lastSent = localStorage.getItem("lastSentDate");
                setAlreadySent(lastSent === today);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    useEffect(() => {
        if (authenticated && user && hasNotice && notice) {
            document.body.style.backgroundColor =
                notice.backgroundColor || "#ffffff";
        } else {
            document.body.style.backgroundColor = "";
        }

        return () => {
            document.body.style.backgroundColor = "";
        };
    }, [authenticated, user, hasNotice, notice]);

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
        <div className="min-h-screen bg-background text-foreground font-sans relative">
            {authenticated && user && hasNotice ? (
                <div
                    className="fixed inset-0 z-10"
                    style={{
                        backgroundColor: notice.backgroundColor || "#f0f0f0",
                        color: notice.foregroundColor || "#000000",
                    }}
                >
                    <div className="p-4 h-full flex flex-col justify-center items-center text-center gap-4">
                        {notice.message && (
                            <p className="text-[175%] whitespace-pre-wrap">
                                {notice.message}
                            </p>
                        )}
                        {notice.photoUrl && (
                            <Image
                                src={notice.photoUrl}
                                alt="notice photo"
                                className="w-[100%] h-[40%] object-cover rounded-[12px]"
                                width={0}
                                height={0}
                                unoptimized
                            />
                        )}
                        {notice.songUrl && (
                            <div className="text-[160%]">
                                <a
                                    href={notice.songUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 underline"
                                >
                                    {notice.songUrl}
                                </a>
                                {notice.songExplanation && (
                                    <p>{notice.songExplanation}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
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
                                        <p className="text-center">
                                            Your partner hasn't sent a notice
                                            yet. Check back later!
                                        </p>
                                        {!alreadySent && (
                                            <Link
                                                href="/create-notice"
                                                className="cursor-pointer"
                                            >
                                                <Button>Create Notice</Button>
                                            </Link>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="min-w-xs">
                                    <CardContent className="flex flex-col items-center gap-4">
                                        <p className="text-xl font-semibold">
                                            Pair with Partner
                                        </p>
                                        <p>
                                            Your Unique Code: {user.uniqueCode}
                                        </p>
                                        <Input
                                            type="text"
                                            value={pairCode}
                                            onChange={(e) =>
                                                setPairCode(e.target.value)
                                            }
                                            placeholder="Enter partner's unique code"
                                        />
                                        <Button onClick={handlePair}>
                                            Pair
                                        </Button>
                                        {pairMessage && <p>{pairMessage}</p>}
                                    </CardContent>
                                </Card>
                            )}
                            <Link href="/me" className="cursor-pointer">
                                <Button variant="outline">Me</Button>
                            </Link>
                        </div>
                    ) : (
                        <Button onClick={loginWithGoogle} variant="outline">
                            Login with Google
                        </Button>
                    )}
                </div>
            )}

            {authenticated && user && (
                <div className="fixed bottom-4 right-4 z-50">
                    <Button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-[50px] h-[50px] rounded-full bg-primary text-primary-foreground shadow-lg"
                    >
                        <Plus
                            style={{
                                scale: menuOpen ? 1.75 : 1.25,
                                rotate: menuOpen ? "45deg" : "0deg",
                                transition: "all 0.2s",
                            }}
                        />
                    </Button>
                    <div
                        className="absolute flex flex-col bottom-[60px] right-0 bg-popover border border-border rounded-lg shadow-lg p-2 gap-2"
                        style={{
                            opacity: menuOpen ? 1 : 0,
                            pointerEvents: menuOpen ? "auto" : "none",
                            transition: "opacity 0.2s",
                        }}
                    >
                        {!alreadySent && (
                            <Link
                                href="/create-notice"
                                className="cursor-pointer"
                            >
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                >
                                    Create Notice
                                </Button>
                            </Link>
                        )}
                        <Link href="/me" className="cursor-pointer">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                            >
                                Me
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
