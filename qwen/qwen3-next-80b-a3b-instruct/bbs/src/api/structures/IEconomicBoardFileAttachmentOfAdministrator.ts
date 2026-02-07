import { tags } from "typia";

export namespace IEconomicBoardFileAttachmentOfAdministrator {
  /**
   * Lightweight metadata for an individual file attachment associated with an article. Used in paginated lists when viewing an article's attachments. Contains only public, non-sensitive information: filename, file size, MIME type, and upload timestamp. This removes overhead of full details and avoids exposing ownership or deletion status to API consumers.
   */
  export type ISummary = {
    /**
     * Unique identifier for the file attachment.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from economic_board_file_attachments.id. UUID primary key uniquely identifying the file attachment.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The original name of the uploaded file as provided by the user.
     *
     * @x-autobe-database-schema-property file_name
     * @x-autobe-specification Direct mapping from economic_board_file_attachments.file_name. Original filename as uploaded by the user.
     */
    file_name: string;

    /**
     * The size of the uploaded file in bytes.
     *
     * @x-autobe-database-schema-property file_size
     * @x-autobe-specification Direct mapping from economic_board_file_attachments.file_size. File size in bytes stored during upload validation.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * The MIME type of the file determined during upload validation.
     *
     * @x-autobe-database-schema-property mime_type
     * @x-autobe-specification Direct mapping from economic_board_file_attachments.mime_type. MIME type determined during upload validation.
     */
    mime_type: string;

    /**
     * The timestamp when the file was uploaded in ISO 8601 format.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from economic_board_file_attachments.created_at. Timestamp set to current server time in Asia/Seoul timezone during upload.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
