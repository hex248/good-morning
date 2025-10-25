import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

function getCookieValue(
    cookieHeader: string,
    name: string
): string | undefined {
    const parts = cookieHeader.split(/;\s*/);
    for (const part of parts) {
        const [k, ...rest] = part.split("=");
        if (k === name) return rest.join("=");
    }
    return undefined;
}

export async function POST(req: Request) {
    try {
        // jwt
        const cookieHeader = req.headers.get("cookie") || "";
        const jwt = getCookieValue(cookieHeader, "jwt");
        if (!jwt) {
            return NextResponse.json(
                { error: "unauthorized" },
                { status: 401 }
            );
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json(
                { error: "server misconfigured (JWT_SECRET)" },
                { status: 500 }
            );
        }
        try {
            const secret = new TextEncoder().encode(jwtSecret);
            await jwtVerify(jwt, secret);
        } catch {
            return NextResponse.json(
                { error: "unauthorized" },
                { status: 401 }
            );
        }

        // parse form data
        const form = await req.formData();
        const file = form.get("image");

        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { error: "no image file provided" },
                { status: 400 }
            );
        }

        // image file constraints
        const f = file as File;
        const size = f.size;
        const type = f.type;
        const originalName = f.name as string | undefined;
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            // iOS HEIC/HEIF support
            "image/heic",
            "image/heif",
        ];
        const allowedExts = new Set([
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".heic",
            ".heif",
        ]);
        if (size > maxSize) {
            return NextResponse.json(
                { error: "file size exceeds 5mb limit" },
                { status: 400 }
            );
        }
        if (!allowedTypes.includes(type)) {
            return NextResponse.json(
                { error: `invalid file type: ${type}` },
                { status: 400 }
            );
        }
        const ext =
            (originalName || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
        if (!allowedExts.has(ext)) {
            return NextResponse.json(
                { error: `invalid file extension: ${ext || "unknown"}` },
                { status: 400 }
            );
        }

        // R2 client init
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const endpoint = process.env.R2_ENDPOINT;
        const region = process.env.R2_REGION;
        const bucket = process.env.R2_BUCKET_NAME;
        let publicURL = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;
        if (
            !accessKeyId ||
            !secretAccessKey ||
            !endpoint ||
            !region ||
            !bucket ||
            !publicURL
        ) {
            return NextResponse.json(
                { error: "storage not configured" },
                { status: 500 }
            );
        }

        const s3 = new S3Client({
            region,
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
        });

        const timestamp = Date.now();
        const randomHex = crypto.randomBytes(8).toString("hex");
        const key = `${timestamp}_${randomHex}${ext}`;

        // buffer from file
        const arrayBuffer = await f.arrayBuffer();
        const body = Buffer.from(arrayBuffer);

        const putContentType =
            type ||
            (ext === ".heic"
                ? "image/heic"
                : ext === ".heif"
                ? "image/heif"
                : "application/octet-stream");

        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: putContentType,
                ACL: "public-read",
            })
        );

        // remove trailing slash if any
        if (publicURL.endsWith("/")) publicURL = publicURL.slice(0, -1);
        const url = `${publicURL}/${key}`;

        return NextResponse.json({ url }, { status: 200 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: `proxy error: ${String(err)}` },
            { status: 500 }
        );
    }
}
