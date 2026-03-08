import { tags } from "typia";

export namespace ICommunityPlatformPostImage {
  /**
   * Pagination parameters for retrieving a list of post images. Controls the size and position of the result set when listing images attached to a post.
   */
  export type IRequest = {
    /**
     * Maximum number of images to return per page. Default is 20.
     *
     * @x-autobe-specification Maximum number of images to return per page. Defaults to 20 if not specified. Must be between 1 and 100. Used in LIMIT clause of SQL query against community_platform_post_images.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Number of images to skip for pagination. Use with limit to navigate through large result sets.
     *
     * @x-autobe-specification Number of images to skip for pagination. Used in OFFSET clause of SQL query. If page is provided, offset is automatically calculated as (page - 1) * limit. Otherwise, offset defaults to 0.
     */
    offset?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Target page number to retrieve (1-indexed). Specifies which page of results to return. Page numbering starts from 1. If omitted, null, or undefined, defaults to page 1 (first page). Requesting a page beyond the available range returns an empty data array with valid pagination metadata reflecting the actual totals.
     *
     * @x-autobe-specification 1-indexed page number. Defaults to 1 if not provided. When specified, offset is automatically calculated as (page - 1) * limit, overriding any explicit offset value.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Request body for attaching an uploaded image file to an existing image-type post. The fileUrl must reference a file that was previously uploaded through the file upload endpoint with file_type 'post_image'. The authenticated member must own the file and the file must not already be attached to any post. Supported formats: JPEG, PNG, GIF, WebP with maximum size 20MB. The order field controls gallery position; if omitted, the image is appended to the end of the gallery.
   */
  export type ICreate = {
    /**
     * URL of the uploaded image file to attach. Must reference a previously uploaded file of type 'post_image' owned by the authenticated member. The backend validates file ownership, type, and availability before attachment. Supported formats: JPEG, PNG, GIF, WebP.
     *
     * @x-autobe-specification Computed from fileUrl: backend parses URL to extract file identifier -> queries community_platform_files WHERE id = parsed_id -> validates file.file_type = 'post_image', file.member_id = authenticated member, file not already attached to this post -> stores file.id as community_platform_file_id in community_platform_post_images junction table. File validation includes: MIME type check (image/jpeg, image/png, image/gif, image/webp), size limit (20MB), and storage quota (500MB per member).
     */
    fileUrl: string & tags.Format<"uri">;

    /**
     * Gallery display position for this image. Images are shown in ascending order (0, 1, 2...). If omitted, the image is automatically appended to the end of the gallery. Must not conflict with existing image positions for this post.
     *
     * @x-autobe-database-schema-property order
     * @x-autobe-specification Direct mapping from community_platform_post_images.order. Optional field - if not provided, backend auto-assigns: SELECT COALESCE(MAX(order) + 1, 0) FROM community_platform_post_images WHERE community_platform_post_id = :postId. Images are displayed in ascending order (0, 1, 2...). Must not conflict with existing image positions for this post if explicitly provided.
     */
    order?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary representation of an image attached to a post, containing essential metadata for gallery display. Includes the image's MIME type, file size, dimensions, and pre-generated CDN URLs for four display versions: thumbnail (150x150px for feed previews), medium (400x400px for embedded display), large (800x800px for detail views), and original (full-resolution). Images are ordered by the order field for consistent gallery sequencing.
   */
  export type ISummary = {
    /**
     * Unique identifier for the post-image association record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_post_images.id. UUID primary key identifying this image-post association record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display position of this image within the post's gallery. Images are shown in ascending order.
     *
     * @x-autobe-database-schema-property order
     * @x-autobe-specification Direct mapping from community_platform_post_images.order. Integer representing display position within the gallery. Images are shown in ascending order (0, 1, 2...). Lower numbers appear first.
     */
    order: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * MIME type of the image file (e.g., image/jpeg, image/png, image/gif, image/webp).
     *
     * @x-autobe-specification Retrieved via JOIN: community_platform_post_images.community_platform_file_id -> community_platform_files.id -> mime_type. Valid values: image/jpeg, image/png, image/gif, image/webp. Used for content-type validation and display logic.
     */
    mime_type: string;

    /**
     * Size of the image file in bytes.
     *
     * @x-autobe-specification Retrieved via JOIN: community_platform_post_images.community_platform_file_id -> community_platform_files.id -> file_size. File size in bytes. Maximum allowed is 20MB (20,971,520 bytes) for post images.
     */
    file_size: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Width of the image in pixels. May be null if dimensions have not been extracted yet.
     *
     * @x-autobe-specification Retrieved via JOIN: community_platform_post_images.community_platform_file_id -> community_platform_files.id -> width. Image width in pixels. May be null before dimension extraction or for non-image files. Valid range: 1-8192 pixels.
     */
    width: (number & tags.Type<"int32"> & tags.Minimum<1>) | null;

    /**
     * Height of the image in pixels. May be null if dimensions have not been extracted yet.
     *
     * @x-autobe-specification Retrieved via JOIN: community_platform_post_images.community_platform_file_id -> community_platform_files.id -> height. Image height in pixels. May be null before dimension extraction or for non-image files. Valid range: 1-8192 pixels.
     */
    height: (number & tags.Type<"int32"> & tags.Minimum<1>) | null;

    /**
     * CDN URL for the thumbnail version (~150x150px), optimized for feed previews.
     *
     * @x-autobe-specification Computed URL from JOIN: community_platform_post_images.community_platform_file_id -> community_platform_file_versions WHERE version_type = 'thumbnail' -> version_path + CDN base URL prefix. Approximately 150x150px for feed previews.
     */
    thumbnail_url: string & tags.Format<"url">;

    /**
     * CDN URL for the medium version (~400x400px), optimized for embedded display.
     *
     * @x-autobe-specification Computed URL from JOIN: community_platform_post_images.community_platform_file_id -> community_platform_file_versions WHERE version_type = 'medium' -> version_path + CDN base URL prefix. Approximately 400x400px for embedded display.
     */
    medium_url: string & tags.Format<"url">;

    /**
     * CDN URL for the large version (~800x800px), optimized for detail views.
     *
     * @x-autobe-specification Computed URL from JOIN: community_platform_post_images.community_platform_file_id -> community_platform_file_versions WHERE version_type = 'large' -> version_path + CDN base URL prefix. Approximately 800x800px for detail views.
     */
    large_url: string & tags.Format<"url">;

    /**
     * CDN URL for the original full-resolution image.
     *
     * @x-autobe-specification Computed URL from JOIN: community_platform_post_images.community_platform_file_id -> community_platform_file_versions WHERE version_type = 'original' -> version_path + CDN base URL prefix. Full-resolution image for download.
     */
    original_url: string & tags.Format<"url">;

    /**
     * Timestamp when this image was attached to the post.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_post_images.created_at. Timestamp when the image was attached to the post. Used for audit trail and chronological tracking.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
