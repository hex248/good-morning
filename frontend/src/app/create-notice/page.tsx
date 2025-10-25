"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    const [alreadySent, setAlreadySent] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
        null
    );
    const [formData, setFormData] = useState({
        message: "",
        photoUrl: "",
        songUrl: "",
        songExplanation: "",
        foregroundColor: "",
        backgroundColor: "",
    });
    const router = useRouter();

    const today = new Date().toISOString().split("T")[0];

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

            const lastSent = localStorage.getItem("lastSentDate");
            if (lastSent === today) {
                setAlreadySent(true);
            }
            setLoading(false);
        };
        initAuth();
    }, [router, today]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadedImageUrl(URL.createObjectURL(file));
            setFormData((prev) => ({ ...prev, photoUrl: "" })); // clear photoUrl
        } else {
            setSelectedFile(null);
            setUploadedImageUrl(null);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setFormData((prev) => ({ ...prev, photoUrl: url }));
        if (url) {
            setSelectedFile(null);
            setUploadedImageUrl(null);
        }
    };

    const handleSubmit = async () => {
        if (!formData.foregroundColor || !formData.backgroundColor) {
            setMessage("Please select foreground and background colors");
            return;
        }

        let photoUrl = formData.photoUrl;

        if (selectedFile) {
            const formDataUpload = new FormData();
            formDataUpload.append("image", selectedFile);

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
                    {
                        method: "POST",
                        body: formDataUpload,
                        credentials: "include",
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    photoUrl = data.url;
                } else {
                    const errorData = await response.json();
                    setMessage(
                        `Upload failed: ${errorData.error || "Unknown error"}`
                    );
                    return;
                }
            } catch (error) {
                setMessage(`Failed to upload image: ${error}`);
                console.error(error);
                return;
            }
        }

        const result = await createNotice({ ...formData, photoUrl });
        setMessage(result.message);
        if (result.success) {
            localStorage.setItem("lastSentDate", today);
            setAlreadySent(true);
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
        return null; // will redirect
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

    if (alreadySent) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-center items-center gap-8 p-4">
                <h1 className="text-4xl font-semibold">Create Notice</h1>
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 p-8">
                        <p>You have already sent a notice today.</p>
                        <Link href="/">
                            <Button>Back to Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
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
                <h1 className="text-4xl font-semibold mb-4 text-center">
                    Create Notice
                </h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Notice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="block text-sm font-medium mb-2">
                                    Foreground Color
                                </Label>
                                <Select
                                    value={formData.foregroundColor}
                                    onValueChange={(value) =>
                                        handleInputChange(
                                            "foregroundColor",
                                            value
                                        )
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
                                            formData.foregroundColor ||
                                            undefined
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
                                        handleInputChange(
                                            "backgroundColor",
                                            value
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        style={{
                                            color:
                                                formData.backgroundColor ===
                                                "#ffffff"
                                                    ? "#000000"
                                                    : formData.backgroundColor ===
                                                      "#000000"
                                                    ? "#ffffff"
                                                    : undefined,
                                            backgroundColor:
                                                formData.backgroundColor,
                                            borderColor:
                                                formData.backgroundColor ===
                                                "#ffffff"
                                                    ? "#000000"
                                                    : formData.backgroundColor ===
                                                      "#000000"
                                                    ? "#ffffff"
                                                    : undefined,
                                        }}
                                        chevronColor={
                                            formData.backgroundColor ===
                                            "#ffffff"
                                                ? "#000000"
                                                : formData.backgroundColor ===
                                                  "#000000"
                                                ? "#ffffff"
                                                : undefined
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
                                Photo
                            </Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="mb-2"
                            />
                            {!selectedFile && (
                                <>
                                    <Label className="block text-sm font-medium mb-2">
                                        or enter a photo URL:
                                    </Label>
                                    <Input
                                        value={formData.photoUrl}
                                        onChange={handleUrlChange}
                                        placeholder="https://example.com/image.jpg"
                                        disabled={!!selectedFile}
                                    />
                                </>
                            )}
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
                    <Card className="mt-8 max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="relative mx-auto border-2 rounded-3xl overflow-hidden shadow-lg"
                                style={{
                                    aspectRatio: "9/16",
                                    backgroundColor:
                                        formData.backgroundColor || "#f0f0f0",
                                    color:
                                        formData.foregroundColor || "#000000",
                                }}
                            >
                                <div className="p-4 h-full flex flex-col justify-center items-center text-center gap-4">
                                    {formData.message && (
                                        <p className="text-[175%] whitespace-pre-wrap">
                                            {formData.message}
                                        </p>
                                    )}
                                    {(uploadedImageUrl ||
                                        formData.photoUrl) && (
                                        <Image
                                            src={
                                                uploadedImageUrl ||
                                                formData.photoUrl
                                            }
                                            alt="notice photo"
                                            className="w-[100%] h-[50%] object-cover rounded-[12px]"
                                            width={0}
                                            height={0}
                                            unoptimized
                                        />
                                    )}
                                    {formData.songUrl && (
                                        <div className="w-full">
                                            <div
                                                className="flex items-center gap-4 border border-4 p-4 rounded-lg"
                                                style={{
                                                    borderWidth: "4px",
                                                    borderColor:
                                                        formData.foregroundColor ||
                                                        "#000000",
                                                    color:
                                                        formData?.foregroundColor ||
                                                        "#000000",
                                                }}
                                            >
                                                <Image
                                                    src={"/default-avatar.png"}
                                                    alt="Album Cover"
                                                    width={96}
                                                    height={96}
                                                    className="rounded"
                                                    unoptimized
                                                />
                                                <div className="flex flex-col items-start">
                                                    <span className="text-4xl break-normal font-bold">
                                                        track title
                                                    </span>
                                                    <span className="text-2xl break-normal font-medium">
                                                        artist name
                                                    </span>
                                                    {formData.songExplanation && (
                                                        <span className="text-lg text-left whitespace-pre-wrap break-normal">
                                                            “
                                                            {
                                                                formData.songExplanation
                                                            }
                                                            ”
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
