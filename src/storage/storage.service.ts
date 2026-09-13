/**
 * @canonical-root File-12: 12_02_SUB_BASE_CLOUD_STORAGE
 * @child-ext      NONE
 * @tier           Tier-1
 * @domain         Domain-02
 * @zero-loss-rule Invariant validated against master specification
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

export interface StorageUploadResult {
  key: string;
  bucket: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor() {
    this.bucket = process.env["STORAGE_S3_BUCKET"] || "risemitra-storage";
    const endpoint = process.env["STORAGE_S3_ENDPOINT"];
    const accessKeyId = process.env["STORAGE_ACCESS_KEY"] || "";
    const secretAccessKey = process.env["STORAGE_SECRET_KEY"] || "";

    this.publicBaseUrl = process.env["STORAGE_PUBLIC_URL"];

    this.client = new S3Client({
      endpoint: endpoint || undefined,
      region: process.env["AWS_REGION"] || "auto",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Cloudflare R2 और कस्टम S3 कम्पैटिबल एंडपॉइंट्स हेतु
    });
  }

  /**
   * बाइनरी बफर या स्ट्रिंग को क्लाउड स्टोरेज में अपलोड करता है
   */
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    mimeType: string = "application/octet-stream"
  ): Promise<StorageUploadResult> {
    const payloadBuffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(body as string);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: payloadBuffer,
      ContentType: mimeType,
    });

    await this.client.send(command);

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return {
      key,
      bucket: this.bucket,
      url,
      sizeBytes: payloadBuffer.byteLength,
      mimeType,
    };
  }

  /**
   * स्टोरेज से फ़ाइल को Node.js Buffer के रूप में प्राप्त करता है
   */
  async getFileBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`[StorageService] Object empty or not found: ${key}`);
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * स्टोरेज से फ़ाइल को स्थायी रूप से हटाता है
   */
  async deleteFile(key: string): Promise<boolean> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    return true;
  }

  /**
   * बकेट कनेक्टिविटी और क्रेडेंशियल्स की स्थिति जांचता है
   */
  async checkHealth(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({
        Bucket: this.bucket,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
export default storageService;
