import { IPage } from "./IPage";
import { IDiscussionBoardReport } from "./IDiscussionBoardReport";

export namespace IPageIDiscussionBoardReport {
  /**
   * Paginated collection of discussion board report summaries for moderation
   * and review.
   *
   * This DTO combines pagination information from `IPage.IPagination` with an
   * array of `IDiscussionBoardReport.ISummary` items, each describing a
   * single report stored in the `discussion_board_reports` Prisma model. It
   * is the canonical response wrapper for list-style moderation endpoints
   * such as `PATCH /discussionBoard/adminUser/reports` and `PATCH
   * /discussionBoard/adminUser/articles/{articleId}/attachments/{attachmentId}/reportLinks`.
   *
   * Moderation UIs rely on this schema to render report queues, apply filters
   * and sorting, and traverse through multiple pages of report summaries
   * while keeping network payloads compact and focused on key workflow fields
   * like status, action, and timestamps.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window of report results.
     *
     * Includes the current page index, page size, total number of reports,
     * and total page count for the query executed over the
     * `discussion_board_reports` table. This information enables moderation
     * tools to implement paged navigation through large sets of reports.
     */
    pagination: IPage.IPagination;

    /**
     * List of report summary entries returned for the current page.
     *
     * Each element is an `IDiscussionBoardReport.ISummary` representation
     * of a row from the `discussion_board_reports` Prisma model, optionally
     * filtered by status, target type, reporter type, or date range. These
     * summaries provide just enough information for administrators to
     * triage reports in queues and listing screens without loading full
     * report-detail payloads.
     */
    data: IDiscussionBoardReport.ISummary[];
  };
}
