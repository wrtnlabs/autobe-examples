import { IPage } from "./IPage";
import { IDiscussionBoardCommentAttachment } from "./IDiscussionBoardCommentAttachment";

export namespace IPageIDiscussionBoardCommentAttachment {
  /**
   * Paginated collection of discussion board comment attachment summary
   * records.
   *
   * This DTO is used to return pages of summary information for files or
   * images attached to comments on the discussion board. It encapsulates both
   * the pagination state (e.g., current page, records per page, total record
   * count) and a list of attachment summaries, each providing metadata such
   * as the original filename, file URI, MIME type, and upload timestamp. This
   * schema supports listing endpoints with search and filter parameters,
   * allowing clients and moderators to efficiently browse, search, or
   * moderate large collections of attachments related to specific comments.
   *
   * It is designed specifically for API operations that require robust
   * listing capability (with pagination) over potentially large data sets.
   * Usage scenarios include rendering attachment lists in the UI, supporting
   * download previews, handling moderation of attachments, or performing
   * audits for compliance. The structure enforces that pagination data and
   * records are always present for consistency and reliability of the API
   * response across all use cases.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardCommentAttachment.ISummary[];
  };
}
