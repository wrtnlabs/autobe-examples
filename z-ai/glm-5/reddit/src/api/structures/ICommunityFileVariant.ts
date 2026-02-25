import { tags } from "typia";

export namespace ICommunityFileVariant {
  /**
   * Lightweight summary of an image variant for responsive display purposes. Represents a single size variant (thumbnail, medium, or large) generated from an original uploaded image. Contains essential metadata including the variant type identifier, pixel dimensions for responsive selection, storage URL for image access, file size for performance considerations, and MIME type for content handling. Used in file responses to provide multiple size options for different device contexts.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property variant_type
     */
    variantType: string;
    /**
     * @x-autobe-database-schema-property width
     */
    width: number & tags.Type<"int32">;
    /**
     * @x-autobe-database-schema-property height
     */
    height: number & tags.Type<"int32">;
    /**
     * @x-autobe-database-schema-property storage_path
     */
    storagePath: string;
    /**
     * @x-autobe-database-schema-property file_size
     */
    fileSize: number & tags.Type<"int32">;
    /**
     * @x-autobe-database-schema-property mime_type
     */
    mimeType: string;
    /**
     * @x-autobe-database-schema-property created_at
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
