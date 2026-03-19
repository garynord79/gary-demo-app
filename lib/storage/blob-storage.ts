export interface BlobStorageAdapter {
  upload(params: {
    key: string;
    data: ArrayBuffer | Uint8Array;
    contentType: string;
  }): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

export class VercelBlobAdapter implements BlobStorageAdapter {
  async upload(params: {
    key: string;
    data: ArrayBuffer | Uint8Array;
    contentType: string;
  }): Promise<{ url: string }> {
    void params;
    throw new Error(
      "VercelBlobAdapter.upload is a stub. Implement @vercel/blob integration before use.",
    );
  }

  async delete(key: string): Promise<void> {
    void key;
    throw new Error(
      "VercelBlobAdapter.delete is a stub. Implement @vercel/blob integration before use.",
    );
  }
}
