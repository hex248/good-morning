import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
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
        const maxSize = 20 * 1024 * 1024; // 20mb
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
                { error: "file size exceeds limit" },
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

        // buffer from file
        const arrayBuffer = await f.arrayBuffer();
        const body = Buffer.from(arrayBuffer);

        // optionally convert to jpeg
        const skipJpegConversion = true;
        let uploadBody: Buffer = body;
        let uploadExt: string = ext;
        let uploadContentType: string =
            type ||
            (ext === ".heic"
                ? "image/heic"
                : ext === ".heif"
                ? "image/heif"
                : "application/octet-stream");
        if (!skipJpegConversion) {
            try {
                const jpeg = await sharp(body).jpeg({ quality: 85 }).toBuffer();
                uploadBody = jpeg;
                uploadExt = ".jpg";
                uploadContentType = "image/jpeg";
            } catch {
                // original will be used anyway
            }
        }

        const timestamp = Date.now();
        const randomHex = crypto.randomBytes(8).toString("hex");
        const key = `${timestamp}_${randomHex}${uploadExt}`;

        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: uploadBody,
                ContentType: uploadContentType,
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
