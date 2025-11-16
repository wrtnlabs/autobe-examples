import { IPage } from "./IPage";
import { IRedditCommunityModerationAction } from "./IRedditCommunityModerationAction";

export namespace IPageIRedditCommunityModerationAction {
  /**
   * Paginated response containing moderation action summaries for audit
   * logging.
   *
   * This wrapper type encapsulates a page of moderation action records along
   * with pagination metadata, enabling efficient browsing through
   * comprehensive moderation history. It follows the standard pagination
   * pattern used throughout the Reddit Community API for consistent list
   * response handling.
   *
   * Used in moderation oversight endpoints to return filtered and sorted
   * action logs. The pagination information allows clients to implement
   * page-based navigation controls for moderation dashboards, while the data
   * array contains the actual action summaries for display in audit trails,
   * transparency reports, moderator performance reviews, and accountability
   * tracking interfaces.
   *
   * Typically returned from operations that search and retrieve moderation
   * actions, supporting use cases such as reviewing moderator decisions,
   * analyzing moderation patterns, investigating specific incidents, tracking
   * community-level moderation activity, and maintaining platform-wide
   * transparency in content moderation workflows.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the moderation action list.
     *
     * Contains comprehensive pagination information including current page
     * number, records per page limit, total record count in the database,
     * and total page count. This metadata enables clients to implement
     * pagination controls for browsing through extensive moderation history
     * and display accurate page navigation interfaces.
     *
     * Critical for moderation dashboards and audit interfaces that need to
     * efficiently navigate through potentially thousands of moderation
     * actions across multiple pages.
     */
    pagination: IPage.IPagination;

    /**
     * Array of moderation action summary records for the current page.
     *
     * Contains the actual moderation action audit records matching the
     * request filters and pagination parameters. Each item is a summary
     * representation of a moderator action including action identifier,
     * responsible moderator, action type, target entity information,
     * optional reasoning, and execution timestamp.
     *
     * This array may be empty if no moderation actions match the filter
     * criteria or if the requested page is beyond the available data range.
     * The array length will not exceed the limit specified in the
     * pagination parameters. Used for displaying moderation history,
     * accountability tracking, and transparency reporting.
     */
    data: IRedditCommunityModerationAction.ISummary[];
  };
}
