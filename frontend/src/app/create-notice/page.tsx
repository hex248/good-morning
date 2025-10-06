"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkAuth, createNotice, type User } from "@/lib/api";
import { Label } from "@/components/ui/label";

const colors = [
    { value: "#ce3e3e", label: "Red" },
    { value: "#658ee9", label: "Blue" },
    { value: "#58d358", label: "Green" },
    { value: "#f5e342", label: "Yellow" },
    { value: "#af3ae6", label: "Purple" },
    { value: "#ff8c00", label: "Orange" },
    { value: "#e4599e", label: "Pink" },
    { value: "#8b4513", label: "Brown" },
    { value: "#000000", label: "Black" },
    { value: "#ffffff", label: "White" },
];

export default function CreateNoticePage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState(false);
    const [formData, setFormData] = useState({
        message: "",
        photoUrl: "",
        songUrl: "",
        songExplanation: "",
        foregroundColor: "",
        backgroundColor: "",
    });
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

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.foregroundColor) {
            setMessage("Please select a foreground color");
            return;
        }
        if (!formData.backgroundColor) {
            setMessage("Please select a background color");
            return;
        }
        const result = await createNotice(formData);
        setMessage(result.message);
        if (result.success) {
            router.push("/");
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
        return null;
    }

    if (!partner) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-center items-center gap-8 p-4">
                <h1 className="text-4xl font-semibold">Create Notice</h1>
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 p-8">
                        <p>You need to pair with a partner first.</p>
                        <Link href="/">
                            <Button>Back to Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-semibold mb-8">Create Notice</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Notice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label className="block text-sm font-medium mb-2">
                                Foreground Color
                            </Label>
                            <Select
                                value={formData.foregroundColor}
                                onValueChange={(value) =>
                                    handleInputChange("foregroundColor", value)
                                }
                            >
                                <SelectTrigger
                                    style={{
                                        color: formData.foregroundColor,
                                        backgroundColor:
                                            formData.foregroundColor ===
                                            "#ffffff"
                                                ? "transparent"
                                                : formData.foregroundColor ===
                                                  "#000000"
                                                ? "#ffffff"
                                                : undefined,
                                        borderColor:
                                            formData.foregroundColor ||
                                            undefined,
                                    }}
                                    chevronColor={
                                        formData.foregroundColor || undefined
                                    }
                                >
                                    <SelectValue placeholder="Select a foreground colour" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <div className="grid grid-cols-2 gap-2 p-2">
                                        {colors.map((color) => (
                                            <SelectItem
                                                key={color.value}
                                                value={color.value}
                                                style={{
                                                    color: color.value,
                                                    backgroundColor:
                                                        color.value ===
                                                        "#ffffff"
                                                            ? "#00000000"
                                                            : color.value ===
                                                              "#000000"
                                                            ? "#ffffff"
                                                            : undefined,
                                                }}
                                                className="cursor-pointer border-1 border-popover hover:border-foreground"
                                            >
                                                {color.label}
                                            </SelectItem>
                                        ))}
                                    </div>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="block text-sm font-medium mb-2">
                                Background Color
                            </Label>
                            <Select
                                value={formData.backgroundColor}
                                onValueChange={(value) =>
                                    handleInputChange("backgroundColor", value)
                                }
                            >
                                <SelectTrigger
                                    style={{
                                        color: formData.backgroundColor,
                                        backgroundColor:
                                            formData.backgroundColor ===
                                            "#ffffff"
                                                ? "transparent"
                                                : formData.backgroundColor ===
                                                  "#000000"
                                                ? "#ffffff"
                                                : undefined,
                                        borderColor:
                                            formData.backgroundColor ||
                                            undefined,
                                    }}
                                    chevronColor={
                                        formData.backgroundColor || undefined
                                    }
                                >
                                    <SelectValue placeholder="Select a background colour" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <div className="grid grid-cols-2 gap-2 p-2">
                                        {colors.map((color) => (
                                            <SelectItem
                                                key={color.value}
                                                value={color.value}
                                                style={{
                                                    backgroundColor:
                                                        color.value,
                                                    color:
                                                        color.value ===
                                                        "#ffffff"
                                                            ? "#000000"
                                                            : color.value ===
                                                              "#000000"
                                                            ? "#ffffff"
                                                            : undefined,
                                                }}
                                                className="cursor-pointer border-1 border-popover hover:border-foreground"
                                            >
                                                {color.label}
                                            </SelectItem>
                                        ))}
                                    </div>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="block text-sm font-medium mb-2">
                                Message
                            </Label>
                            <Textarea
                                value={formData.message}
                                onChange={(e) =>
                                    handleInputChange("message", e.target.value)
                                }
                                placeholder="Your message..."
                                rows={4}
                            />
                        </div>
                        <div>
                            <Label className="block text-sm font-medium mb-2">
                                Photo URL
                            </Label>
                            <Input
                                value={formData.photoUrl}
                                onChange={(e) =>
                                    handleInputChange(
                                        "photoUrl",
                                        e.target.value
                                    )
                                }
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>
                        <div>
                            <Label className="block text-sm font-medium mb-2">
                                Song URL
                            </Label>
                            <Input
                                value={formData.songUrl}
                                onChange={(e) =>
                                    handleInputChange("songUrl", e.target.value)
                                }
                                placeholder="https://open.spotify.com/track/..."
                            />
                        </div>
                        <div>
                            <Label className="block text-sm font-medium mb-2">
                                Song Explanation
                            </Label>
                            <Textarea
                                value={formData.songExplanation}
                                onChange={(e) =>
                                    handleInputChange(
                                        "songExplanation",
                                        e.target.value
                                    )
                                }
                                placeholder="Why this song?"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={() => setPreview(!preview)}>
                                {preview ? "Hide Preview" : "Preview"}
                            </Button>
                            <Button onClick={handleSubmit}>Send Notice</Button>
                        </div>
                        {message && <p className="text-red-500">{message}</p>}
                    </CardContent>
                </Card>
                {preview && (
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="p-4 rounded-lg"
                                style={{
                                    backgroundColor:
                                        formData.backgroundColor || "#f0f0f0",
                                    color:
                                        formData.foregroundColor || "#000000",
                                }}
                            >
                                {formData.message && (
                                    <p className="mb-4">{formData.message}</p>
                                )}
                                {formData.photoUrl && (
                                    <Image
                                        src={formData.photoUrl}
                                        alt="notice photo"
                                        className="w-96 h-96 object-cover rounded mb-4"
                                        width={0}
                                        height={0}
                                        unoptimized
                                    />
                                )}
                                {formData.songUrl && (
                                    <div className="mb-4">
                                        <p className="font-semibold">Song:</p>
                                        <a
                                            href={formData.songUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 underline"
                                        >
                                            {formData.songUrl}
                                        </a>
                                        {formData.songExplanation && (
                                            <p className="mt-2">
                                                {formData.songExplanation}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
                <div className="mt-8">
                    <Link href="/">
                        <Button variant="outline">Back to Home</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
