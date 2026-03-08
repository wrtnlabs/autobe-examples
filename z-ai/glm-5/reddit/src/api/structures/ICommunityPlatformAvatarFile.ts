import { tags } from "typia";

export namespace ICommunityPlatformAvatarFile {
  /**
   * Request body for uploading a new avatar image for the authenticated member's profile. The avatar is displayed on the member's profile page and alongside their content across the platform. Supports JPEG, PNG, GIF, and WebP image formats with a maximum file size of 2 megabytes. Image dimensions must be between 64x64 and 4096x4096 pixels. When uploaded, any existing avatar is automatically replaced.
   */
  export type ICreate = {
    /**
     * Base64-encoded content of the avatar image file. The decoded content must match the declared MIME type and will be virus-scanned before storage.
     */
    file: string;

    /**
     * Original filename provided by the user during upload. Sanitized to remove special characters but preserves the original name for display purposes.
     *
     * @x-autobe-database-schema-property original_name
     */
    originalName: string;

    /**
     * MIME type of the uploaded image. Must match the actual file content. Allowed formats: JPEG, PNG, GIF, WebP.
     *
     * @x-autobe-database-schema-property mime_type
     */
    mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    /**
     * Image width in pixels. Must be between 64 and 4096. If not provided, the backend will extract from the decoded image.
     *
     * @x-autobe-database-schema-property width
     */
    width?:
      | (number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<4096>)
      | null
      | undefined;

    /**
     * Image height in pixels. Must be between 64 and 4096. If not provided, the backend will extract from the decoded image.
     *
     * @x-autobe-database-schema-property height
     */
    height?:
      | (number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<4096>)
      | null
      | undefined;
  };
}
