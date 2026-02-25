import { tags } from "typia";

export namespace IDiscussionBoardSectionImage {
  /**
   * Request parameters for filtering and paginating section image lists. Supports filtering by image type (banner, icon, promotional, thumbnail) and text search across filenames and alt text. Includes standard pagination controls for efficient browsing of image collections.
   */
  export type IRequest = {
    /**
     * @x-autobe-database-schema-property image_type
     */
    image_type?: string | undefined;
    search?: string | null | undefined;
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight summary of section image metadata for list displays, including technical specifications and display information for section branding and visual identification.
   */
  export type ISummary = {
    /**
     * Unique identifier for the section image.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_section_images.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Original filename of the uploaded image file.
     *
     * @x-autobe-database-schema-property filename
     * @x-autobe-specification Direct mapping from discussion_board_section_images.filename. Original uploaded filename.
     */
    filename: string;

    /**
     * MIME type of the image file (e.g., image/jpeg, image/png, image/gif).
     *
     * @x-autobe-database-schema-property mime_type
     * @x-autobe-specification Direct mapping from discussion_board_section_images.mime_type. Image format identifier.
     */
    mime_type: string;

    /**
     * Size of the image file in bytes.
     *
     * @x-autobe-database-schema-property file_size
     * @x-autobe-specification Direct mapping from discussion_board_section_images.file_size. Size in bytes.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * Width of the image in pixels.
     *
     * @x-autobe-database-schema-property width
     * @x-autobe-specification Direct mapping from discussion_board_section_images.width. Pixel dimension.
     */
    width: number & tags.Type<"int32">;

    /**
     * Height of the image in pixels.
     *
     * @x-autobe-database-schema-property height
     * @x-autobe-specification Direct mapping from discussion_board_section_images.height. Pixel dimension.
     */
    height: number & tags.Type<"int32">;

    /**
     * Type of section image (banner, icon, promotional, thumbnail).
     *
     * @x-autobe-database-schema-property image_type
     * @x-autobe-specification Direct mapping from discussion_board_section_images.image_type. Type classification (banner, icon, promotional, thumbnail).
     */
    image_type: string;

    /**
     * Alternative text description for accessibility.
     *
     * @x-autobe-database-schema-property alt_text
     * @x-autobe-specification Direct mapping from discussion_board_section_images.alt_text. Nullable accessibility text.
     */
    alt_text: string | null;
  };

  /**
   * Request body for creating section image attachments. Contains image metadata including filename, MIME type, file size, dimensions, image type, storage path, and optional alternative text for accessibility.
   */
  export type ICreate = {
    /**
     * Original filename of the uploaded image file
     *
     * @x-autobe-database-schema-property filename
     */
    filename: string;

    /**
     * MIME type of the image file (e.g., image/jpeg, image/png, image/gif)
     *
     * @x-autobe-database-schema-property mime_type
     */
    mime_type: string;

    /**
     * Size of the image file in bytes
     *
     * @x-autobe-database-schema-property file_size
     */
    file_size: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Width of the image in pixels
     *
     * @x-autobe-database-schema-property width
     */
    width: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Height of the image in pixels
     *
     * @x-autobe-database-schema-property height
     */
    height: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Type of section image (banner, icon, promotional, thumbnail)
     *
     * @x-autobe-database-schema-property image_type
     */
    image_type: "banner" | "icon" | "promotional" | "thumbnail";

    /**
     * File system path or storage location identifier for the image
     *
     * @x-autobe-database-schema-property storage_path
     */
    storage_path: string;

    /**
     * Alternative text description for accessibility
     *
     * @x-autobe-database-schema-property alt_text
     */
    alt_text?: string | null | undefined;
  };

  /**
   * Request body for updating section image metadata including filename, MIME type, image type classification, and accessibility text. Allows administrators to modify visual presentation properties of section images without affecting the underlying image file content.
   */
  export type IUpdate = {
    /**
     * Updated filename for the section image.
     *
     * @x-autobe-database-schema-property filename
     */
    filename?: string | undefined;

    /**
     * Updated MIME type of the image file.
     *
     * @x-autobe-database-schema-property mime_type
     */
    mime_type?: string | undefined;

    /**
     * Updated classification of the image purpose (banner, icon, promotional, thumbnail).
     *
     * @x-autobe-database-schema-property image_type
     */
    image_type?: string | undefined;

    /**
     * Updated alternative text for accessibility, or null to remove existing alt text.
     *
     * @x-autobe-database-schema-property alt_text
     */
    alt_text?: string | null | undefined;
  };
}
