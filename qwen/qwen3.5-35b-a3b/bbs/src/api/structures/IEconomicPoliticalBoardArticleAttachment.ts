import { tags } from "typia";

export namespace IEconomicPoliticalBoardArticleAttachment {
  /**
   * Request body for creating file attachments associated with an article. Each attachment record stores the file URL, original filename, and type classification. Used when uploading images and documents alongside article creation in the Economic/Political Discussion Board.
   */
  export type ICreate = {
    /**
     * URL path to the stored file in object storage or CDN.
     *
     * @x-autobe-database-schema-property file_url
     * @x-autobe-specification Direct mapping from economic_political_board_attachments.file_url. URI format path to stored file in object storage or CDN after upload.
     */
    file_url: string & tags.Format<"uri">;

    /**
     * Original filename provided by the user (e.g., 'report.pdf', 'chart.png').
     *
     * @x-autobe-database-schema-property file_name
     * @x-autobe-specification Direct mapping from economic_political_board_attachments.file_name. Original filename provided by user (e.g., 'report.pdf', 'chart.png'). Preserves user-facing name for download display.
     */
    file_name: string;

    /**
     * Classification of the attachment: 'image' for image files (PNG, JPG, GIF, etc.) or 'file' for documents and other non-image types (PDF, DOCX, XLSX, etc.).
     *
     * @x-autobe-database-schema-property file_type
     * @x-autobe-specification Direct mapping from economic_political_board_attachments.file_type. Classification: 'image' for image files (PNG, JPG, GIF, etc.) or 'file' for documents and other types (PDF, DOCX, XLSX, etc.).
     */
    file_type: "image" | "file";
  };
}
