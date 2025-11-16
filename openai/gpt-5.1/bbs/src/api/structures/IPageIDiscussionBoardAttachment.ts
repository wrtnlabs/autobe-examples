import { IPage } from "./IPage";
import { IDiscussionBoardAttachment } from "./IDiscussionBoardAttachment";

export namespace IPageIDiscussionBoardAttachment {
  /**
   * Paginated collection of file attachment summaries belonging to a
   * discussion board article.
   *
   * This DTO wraps a list of `IDiscussionBoardAttachment.ISummary` objects
   * together with pagination metadata from `IPage.IPagination`. It is the
   * standard response shape for endpoints such as `PATCH
   * /discussionBoard/articles/{articleId}/attachments`, which list file
   * attachments linked to a specific article row in the
   * `discussion_board_articles` table via the `discussion_board_attachments`
   * model.
   *
   * Clients use this schema to render attachment lists with page controls,
   * showing file name, size, and download URL while allowing the UI to
   * navigate across multiple pages of attachments without fetching the entire
   * dataset at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of attachment results.
     *
     * This object exposes the current page index, page size, total record
     * count, and total page count used when listing attachments under a
     * discussion board article. It directly reflects the server-side
     * pagination state applied when querying `discussion_board_attachments`
     * for the calling endpoint.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of attachment summary records for the current
     * page.
     *
     * Each element is an `IDiscussionBoardAttachment.ISummary` projection
     * of a row in the `discussion_board_attachments` Prisma model. The
     * array contains only the attachments that match the applied filters
     * (such as content type or extension) for the targeted article and fit
     * within the requested pagination window.
     */
    data: IDiscussionBoardAttachment.ISummary[];
  };
}
