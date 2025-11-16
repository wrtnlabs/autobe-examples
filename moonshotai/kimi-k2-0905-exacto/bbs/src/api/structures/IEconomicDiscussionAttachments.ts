import { tags } from "typia";

import { IEconomicDiscussionAttachmentFileType } from "./IEconomicDiscussionAttachmentFileType";

export namespace IEconomicDiscussionAttachments {
  /**
   * File attachment creation DTO for uploading supporting materials to
   * economic discussion articles.
   *
   * This DTO handles secure file uploads with metadata capture for
   * comprehensive file management. The system enforces strict file type
   * validation, size limits, and security scanning requirements to maintain
   * community standards while enabling rich content support.
   *
   * File uploads support multiple formats including documents, spreadsheets,
   * and images with automatic content type detection and appropriate handling
   * procedures for each attachment type category.
   */
  export type ICreate = {
    /**
     * File size in bytes - validated against system limits for security and
     * performance optimization
     */
    file_size: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>;

    /**
     * Content classification determining file handling procedures, preview
     * capabilities, and security scanning requirements
     */
    file_type: IEconomicDiscussionAttachmentFileType;

    /**
     * Original filename provided during upload - preserved for user
     * reference and download naming
     */
    filename: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Standard MIME type ensuring proper browser handling and technical
     * content type validation
     */
    mime_type: string;
  };
}
