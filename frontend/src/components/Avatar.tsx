import Image from "next/image";

interface AvatarProps {
    src?: string;
    alt: string;
    size?: number;
    className?: string;
}

export default function Avatar({
    src = "/default-avatar.png",
    alt,
    size = 96,
    className = "",
}: AvatarProps) {
    return (
        <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className={`rounded-full ${className}`}
        />
    );
}
