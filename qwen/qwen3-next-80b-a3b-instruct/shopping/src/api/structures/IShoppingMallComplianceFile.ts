import { tags } from "typia";

export namespace IShoppingMallComplianceFile {
  /**
   * Request DTO for creating a new compliance file upload.
   *
   * This schema defines elements required to upload a supporting document for
   * a compliance record.
   *
   * Files are uploaded independently and then referenced in compliance
   * records via the attached_files array.
   *
   * This allows for reusable file assets across multiple compliance records
   * and prevents redundant uploads.
   *
   * Each file must contain its original filename, size, MIME type, and a
   * content hash for integrity verification.
   *
   * The content_hash field ensures file integrity and supports deduplication
   * - identical files will produce identical hashes.
   *
   * Files are stored on secure, encrypted storage with access control, and
   * only uploaded by administrators with appropriate permissions.
   *
   * This schema is used when creating new compliance records to reference
   * supporting documentation. The file must be uploaded first and then
   * referenced by content_hash.
   */
  export type ICreate = {
    /**
     * Original filename of the uploaded compliance document.
     *
     * Must contain only valid characters for filenames (letters, numbers,
     * underscores, hyphens, dots). No path separators or special
     * characters.
     *
     * Examples: "GDPR_Audit_Report_2024.pdf",
     * "PCI-DSS_Validation_ScreenShot.png", "Internal_Policy_V3.docx".
     */
    file_name: string;

    /**
     * Size of the file in bytes.
     *
     * Maximum size limit of 10MB (10,485,760 bytes) to ensure efficient
     * storage and transfer.
     *
     * Minimum size of 1 byte to ensure a valid file is uploaded.
     *
     * Used for validation and storage planning.
     *
     * Examples: 2048, 512000, 10485760.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * MIME type of the uploaded file (content type).
     *
     * Must be a standard MIME type indicating the file format (e.g.,
     * application/pdf, image/png, application/msword).
     *
     * This allows proper handling of the file during storage and retrieval.
     *
     * Examples: "application/pdf", "image/jpeg",
     * "application/vnd.openxmlformats-officedocument.wordprocessingml.document".
     */
    file_type: string;

    /**
     * SHA-256 hash of the file content, used for integrity verification and
     * deduplication.
     *
     * Must be a 64-character hexadecimal string representing the SHA-256
     * hash of the complete file content.
     *
     * This ensures file integrity - if the file is modified, the hash will
     * change and the system will recognize it as a different document.
     *
     * Used to prevent duplicate uploads of identical files and ensure
     * uploaded files haven't been corrupted.
     *
     * Examples:
     * "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
     * "f1e0d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5".
     */
    content_hash: string;
  };
}
