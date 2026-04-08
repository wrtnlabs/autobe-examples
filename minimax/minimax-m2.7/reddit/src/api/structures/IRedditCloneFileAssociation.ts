import { tags } from "typia";

import { IRedditCloneFile } from "./IRedditCloneFile";

export namespace IRedditCloneFileAssociation {
  /**
   * Request parameters for searching and filtering user avatar images with pagination support.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number for pagination offset. Computed pagination control: page determines which page of results to return. Minimum value: 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of avatar records to return per page.
     *
     * @x-autobe-specification Maximum number of records per page. Computed pagination control: limit determines the page size for offset-based pagination. Valid range: 1-100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter avatars by user ID to retrieve avatars for a specific user.
     *
     * @x-autobe-specification Filter by owning user ID. Maps to reddit_clone_file_associations.target_id column filtered by target_type='user' discriminator. Returns avatars belonging to the specified user.
     */
    userId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter avatars by file processing status.
     *
     * @x-autobe-specification Filter by file processing status via JOIN with reddit_clone_files table on reddit_clone_file_id. Maps to reddit_clone_files.status column. Allowed values: pending (awaiting virus scan), processed (safe), failed (scan failed or processing error).
     */
    status?: string | undefined;

    /**
     * Filter avatars by file MIME type.
     *
     * @x-autobe-specification Filter by file MIME type via JOIN with reddit_clone_files table on reddit_clone_file_id. Maps to reddit_clone_files.mime_type column. Allowed values: image/jpeg, image/png, image/gif, image/webp.
     */
    mimeType?: string | undefined;
  };

  /**
   * Summary of a user's avatar file association for display in avatar listings and user profiles.
   */
  export type ISummary = {
    /**
     * Unique identifier of the file association.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * UUID of the user who owns this avatar.
     *
     * @x-autobe-database-schema-property target_id
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.target_id when target_type is 'user'. Represents the user who owns this avatar.
     */
    userId: string & tags.Format<"uuid">;

    /**
     * Associated file metadata including name, type, and uploader info.
     *
     * @x-autobe-database-schema-property file
     * @x-autobe-specification BELONGS-TO relation via reddit_clone_file_id. Join to reddit_clone_files.id to fetch file metadata (originalFilename, mimeType, fileSize, status, uploader). Returns IRedditCloneFile.ISummary.
     */
    file: IRedditCloneFile.ISummary;

    /**
     * Timestamp when the avatar was set.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.created_at. Timestamp when the avatar association was created.
     */
    createdAt: string & tags.Format<"date-time">;
  };

  /**
   * Request body for uploading a member's avatar image. The image data should be base64-encoded.
   */
  export type ICreate = {
    /**
     * Base64-encoded image data for the avatar. Accepted formats: JPEG, PNG, GIF, WebP.
     *
     * @x-autobe-specification Base64-encoded image data from request body. Validated for image format (JPEG, PNG, GIF, WebP), size limit (5MB max). Decoded and stored as binary file. Server extracts mime_type from image header, calculates file_size from decoded bytes. Generates unique stored_filename and storage_path for the file.
     */
    imageData: string;

    /**
     * Original filename of the uploaded image for reference purposes.
     *
     * @x-autobe-specification Direct mapping to reddit_clone_files.original_filename column. Stores the original filename as provided by the user's uploaded image for reference and display purposes. maxLength 255 enforced.
     */
    filename?: (string & tags.MinLength<1> & tags.MaxLength<255>) | undefined;
  };

  /**
   * Response containing avatar file association details and accessible file URL after successful upload.
   */
  export type IResponse = {
    /**
     * Unique identifier of the file association record.
     *
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.id (UUID primary key). Unique identifier for the avatar association record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type discriminator indicating this is a user avatar association. Always 'user'.
     *
     * @x-autobe-specification Constant value 'user' indicating avatar association. From reddit_clone_file_associations.target_type constrained to 'user' for avatar associations.
     */
    targetType: string;

    /**
     * UUID of the user profile this avatar is associated with.
     *
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.target_id. References reddit_clone_user_profiles.id of the profile owning this avatar.
     */
    targetId: string & tags.Format<"uuid">;

    /**
     * File metadata for the avatar image.
     *
     * @x-autobe-specification Join via reddit_clone_file_associations.reddit_clone_file_id to reddit_clone_files.id. Returns IRedditCloneFile.ISummary containing id, originalFilename, mimeType, fileSize, status, uploader, createdAt, thumbnails.
     */
    file: IRedditCloneFile.ISummary;

    /**
     * Timestamp when the file association was created.
     *
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.created_at. Timestamp when the avatar association was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the file association was last modified.
     *
     * @x-autobe-specification Direct mapping from reddit_clone_file_associations.updated_at. Timestamp when the avatar association was last modified.
     */
    updatedAt: string & tags.Format<"date-time">;
  };
}
