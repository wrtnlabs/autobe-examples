import { tags } from "typia";

export namespace IEconomicBoardArticleAttachment {
  /**
   * Pagination and sorting parameters for retrieving a list of article attachments from a specific snapshot. Controls how the attachment list is paginated and ordered for frontend display.
   */
  export type IRequest = {
    /**
     * The page number of attachments to retrieve (1-indexed).
     *
     * @x-autobe-specification This parameter controls the page number of results to return (1-indexed). Default value is 1 if not provided. The value must be a positive integer and is validated server-side (minimum: 1). It determines which slice of the attachment list to display in the UI, enabling navigation through large result sets without fetching all attachments at once.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of attachments to return per page (1–100). Default is 10.
     *
     * @x-autobe-specification This parameter defines the maximum number of attachments to return per page. Valid range is 1 to 100. Default value is 10 if not provided. It optimizes network performance by limiting the response size. The server enforces a maximum limit of 100 to prevent overload, even if a client requests a higher value.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<10> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Sort order of attachments by creation time: 'asc' for oldest first, 'desc' for newest first (default).
     *
     * @x-autobe-specification This parameter determines the sort order of attachments by their creation timestamp (created_at). Accepted values are 'asc' (ascending) for oldest-first and 'desc' (descending) for newest-first. Default value is 'desc'. This ensures consistent ordering for UI presentation and pagination stability. Only these two enum values are permitted, as mandated by the operation specification.
     */
    sort?: "asc" | "desc" | undefined;
  };

  /**
   * Immutable metadata for a file or image attachment attached to an article snapshot. Contains essential information for displaying and downloading the attachment in historical views and audit audits. Includes unique identifier, CDN URL, original filename, MIME type, size in bytes, and creation timestamp. Preserves exact state at snapshot time without exposing ownership or modification history.
   */
  export type ISum = {
    /**
     * Unique identifier for this attachment record in the database.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.id. Unique identifier for the attachment record in the database.
     */
    id: string & tags.Format<"uuid">;

    /**
     * CDN-accessible URL where the file or image is stored. Used to download or view the attachment in historical article views.
     *
     * @x-autobe-database-schema-property file_url
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_url. CDN-accessible URL where the file or image is stored.
     */
    file_url: string;

    /**
     * Original filename as uploaded by the user. Preserved exactly to allow users to download the attachment with its intended name.
     *
     * @x-autobe-database-schema-property file_name
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_name. Original filename as uploaded by the user, preserved exactly for download.
     */
    file_name: string;

    /**
     * MIME type of the file (e.g., image/png, application/pdf) determined from file headers. Used by browsers to correctly render or download the attachment.
     *
     * @x-autobe-database-schema-property file_type
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_type. MIME type of the file determined from file headers, not extension.
     */
    file_type: string;

    /**
     * Size of the attachment in bytes. Used to display file size information to users and for bandwidth consumption estimates.
     *
     * @x-autobe-database-schema-property file_size
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_size. Size of the file in bytes for bandwidth estimation and quota tracking.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * ISO 8601 timestamp indicating when the attachment was originally uploaded and stored. Represents the point-in-time state preserved in the article snapshot.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.created_at. Timestamp when the file was uploaded and stored, set server-side.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * A lightweight summary of an article attachment, showing essential metadata for display in user interfaces. Includes the file's original name, type, size, upload timestamp, and a secure URL for accessing the file content.
   */
  export type ISummary = {
    /**
     * Unique identifier for the attachment record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Secure CDN-accessible URL to download the attached file or view the image.
     *
     * @x-autobe-database-schema-property file_url
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_url.
     */
    file_url: string & tags.Format<"uri">;

    /**
     * Original filename as uploaded by the user, preserved exactly for download and reference purposes.
     *
     * @x-autobe-database-schema-property file_name
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_name.
     */
    file_name: string;

    /**
     * MIME type of the file (e.g., image/png, application/pdf), determined from file headers for content validation and browser rendering.
     *
     * @x-autobe-database-schema-property file_type
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_type.
     */
    file_type: string;

    /**
     * Size of the file in bytes, used for bandwidth estimation, quota tracking, and display of file size information to users.
     *
     * @x-autobe-database-schema-property file_size
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.file_size.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * Timestamp when the file was uploaded, in ISO 8601 format. Set server-side upon upload and never modified.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from economic_board_article_attachments.created_at.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
