import { tags } from "typia";

import { ICommunityPlatformPost } from "./ICommunityPlatformPost";

export namespace ICommunityPlatformPostTextContent {
  /**
   * Complete text content details for text-type posts including formatting information, character count, and edit history metadata.
   */
  export type IText = {
    /**
     * The complete text content of the post including any formatting markup or plain text.
     *
     * @x-autobe-database-schema-property content
     * @x-autobe-specification Direct mapping from community_platform_post_text_contents.content column. Stores the complete text body of the post including any formatting markup or plain text.
     */
    content: string;

    /**
     * Character count of the text content for display optimization and validation.
     *
     * @x-autobe-database-schema-property content_length
     * @x-autobe-specification Direct mapping from community_platform_post_text_contents.content_length column. Character count used for display optimization and validation purposes.
     */
    content_length: number & tags.Type<"int32">;

    /**
     * Formatting type indicator (e.g., 'markdown', 'plaintext', 'richtext') for content rendering.
     *
     * @x-autobe-database-schema-property format_type
     * @x-autobe-specification Direct mapping from community_platform_post_text_contents.format_type column. Indicates the formatting method used for content rendering (e.g., 'markdown', 'plaintext', 'richtext').
     */
    format_type: string;

    /**
     * Timestamp of the most recent content edit for version tracking. Null if never edited.
     *
     * @x-autobe-database-schema-property last_edited_at
     * @x-autobe-specification Direct mapping from community_platform_post_text_contents.last_edited_at column. Nullable timestamp tracking the most recent content edit for version control transparency.
     */
    last_edited_at: (string & tags.Format<"date-time">) | null;

    /**
     * Number of times this text content has been edited for transparency.
     *
     * @x-autobe-database-schema-property edit_count
     * @x-autobe-specification Direct mapping from community_platform_post_text_contents.edit_count column. Tracks the number of times this text content has been edited for transparency and version history.
     */
    edit_count: number & tags.Type<"int32">;
  };

  /**
   * Link content details for posts that contain URLs, including the full URL, extracted domain name, and optional metadata such as page title, description, and preview image URL for enhanced link preview functionality.
   */
  export type ILink = {
    /**
     * Unique identifier for the link content record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.id. UUID primary key for link content entity.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The full URL of the linked content that users will navigate to when clicking the link.
     *
     * @x-autobe-database-schema-property url
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.url. Must be a valid URI format as stored in database.
     */
    url: string & tags.Format<"uri">;

    /**
     * Domain name extracted from the URL for display alongside post titles in feeds.
     *
     * @x-autobe-database-schema-property domain
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.domain. Extracted from URL for display purposes and efficient querying.
     */
    domain: string;

    /**
     * Optional title extracted from the linked page's metadata for enhanced preview display.
     *
     * @x-autobe-database-schema-property title
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.title. Nullable field containing page title extracted from linked content metadata.
     */
    title?: string | null | undefined;

    /**
     * Optional description extracted from the linked page's metadata for enhanced preview display.
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.description. Nullable field containing page description extracted from linked content metadata.
     */
    description?: string | null | undefined;

    /**
     * Optional image URL extracted from the linked page's metadata for visual preview display.
     *
     * @x-autobe-database-schema-property image_url
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.image_url. Nullable field containing preview image URL extracted from linked content metadata.
     */
    image_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Timestamp indicating when the link content was initially created and stored.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.created_at. Timestamp when the link content record was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating when the link content was last modified.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_post_link_contents.updated_at. Timestamp when the link content record was last updated.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Complete image content metadata for image-type posts, including storage URLs, dimensions, file information, and accessibility text. Provides all necessary details for rendering and managing image content within posts.
   */
  export type IImage = {
    /**
     * Unique identifier for the image content record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.id. UUID primary key uniquely identifying the image content record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * URL to the original full-size image file.
     *
     * @x-autobe-database-schema-property image_url
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.image_url. Full URL path to the original uploaded image file for high-quality display.
     */
    image_url: string & tags.Format<"uri">;

    /**
     * URL to the thumbnail version of the image for optimized loading.
     *
     * @x-autobe-database-schema-property thumbnail_url
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.thumbnail_url. URL path to the generated thumbnail image for faster loading and responsive display.
     */
    thumbnail_url: string & tags.Format<"uri">;

    /**
     * Size of the image file in bytes.
     *
     * @x-autobe-database-schema-property file_size
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.file_size. Size of the image file in bytes for storage management and optimization purposes.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * Width of the original image in pixels.
     *
     * @x-autobe-database-schema-property image_width
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.image_width. Width of the original image in pixels for display optimization and responsive design.
     */
    image_width: number & tags.Type<"int32">;

    /**
     * Height of the original image in pixels.
     *
     * @x-autobe-database-schema-property image_height
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.image_height. Height of the original image in pixels for display optimization and responsive design.
     */
    image_height: number & tags.Type<"int32">;

    /**
     * Width of the thumbnail image in pixels.
     *
     * @x-autobe-database-schema-property thumbnail_width
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.thumbnail_width. Width of the thumbnail image in pixels for responsive display optimization.
     */
    thumbnail_width: number & tags.Type<"int32">;

    /**
     * Height of the thumbnail image in pixels.
     *
     * @x-autobe-database-schema-property thumbnail_height
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.thumbnail_height. Height of the thumbnail image in pixels for responsive display optimization.
     */
    thumbnail_height: number & tags.Type<"int32">;

    /**
     * Format of the image file (JPEG, PNG, GIF, etc.).
     *
     * @x-autobe-database-schema-property file_format
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.file_format. Image file format (JPEG, PNG, GIF, etc.) for proper rendering and MIME type handling.
     */
    file_format: string;

    /**
     * Accessibility text description of the image content.
     *
     * @x-autobe-database-schema-property alt_text
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.alt_text. Accessibility text description of the image content for screen readers and SEO. Nullable for images without descriptive text.
     */
    alt_text: string | null;

    /**
     * Timestamp when the image content was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.created_at. Timestamp when the image content was created and uploaded to the platform.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the image content was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_post_image_contents.updated_at. Timestamp when the image content was last modified or updated.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * The post that contains this image content.
     *
     * @x-autobe-database-schema-property post
     * @x-autobe-specification Relation mapping via community_platform_post_image_contents.community_platform_post_id foreign key to community_platform_posts.id. Returns ICommunityPlatformPost.ISummary for post context.
     */
    post: ICommunityPlatformPost.ISummary;
  };
}
