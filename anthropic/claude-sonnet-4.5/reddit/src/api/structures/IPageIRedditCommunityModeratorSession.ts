import { IPage } from "./IPage";
import { IRedditCommunityModeratorSession } from "./IRedditCommunityModeratorSession";

export namespace IPageIRedditCommunityModeratorSession {
  /**
   * Paginated response containing moderator authentication session summary
   * records.
   *
   * This pagination wrapper encapsulates a list of moderator session
   * summaries along with metadata describing the pagination state. It enables
   * efficient retrieval of large session histories by breaking them into
   * manageable pages, supporting security monitoring workflows where
   * moderators or administrators need to review authentication activity
   * across multiple login sessions.
   *
   * The structure follows the standard IPage pattern used throughout the API,
   * providing consistent pagination behavior across all list operations. Each
   * page contains a subset of the total session records matching the query
   * criteria, along with navigation information to access other pages in the
   * result set. This consistency ensures predictable client-side pagination
   * logic and uniform UI experiences across different entity types.
   *
   * Integrates with the reddit_community_moderator_sessions Prisma schema
   * table, providing paginated access to authentication session records. The
   * response structure supports use cases including session history reviews,
   * security audits, concurrent session management interfaces, and
   * unauthorized access investigations. Moderators can filter sessions by
   * time ranges, IP addresses, and other criteria, with results organized
   * into pages for optimal performance and usability.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the moderator session
     * result set.
     *
     * Provides comprehensive information about the current page position,
     * total record counts, and page boundaries. This metadata enables
     * clients to build pagination controls, display page numbers, and
     * navigate efficiently through large session histories without loading
     * all records at once.
     *
     * The pagination object contains current page number, records per page
     * limit, total record count matching the filter criteria, and total
     * available pages. These values allow UI components to render accurate
     * page indicators, enable/disable navigation buttons, and show users
     * their position within the complete result set.
     *
     * Critical for security dashboards and session management interfaces
     * where moderators may need to review hundreds of historical
     * authentication sessions across multiple pages.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of moderator authentication session summaries for the
     * current page.
     *
     * Contains an array of session summary objects representing the subset
     * of total matching sessions for this page. Each summary includes
     * essential session identification, connection metadata (IP address),
     * and temporal information (creation and expiration timestamps).
     *
     * The sessions in this array have been filtered according to the
     * request criteria (IP address filters, date ranges, search terms) and
     * sorted according to the specified ordering (by creation time or IP
     * address, ascending or descending). The array length will not exceed
     * the pagination limit, and may be shorter on the final page of
     * results.
     *
     * This session collection enables security monitoring workflows such as
     * reviewing recent logins, identifying concurrent sessions from
     * different IP addresses, detecting suspicious authentication patterns,
     * and providing audit trails for compliance and investigation
     * purposes.
     */
    data: IRedditCommunityModeratorSession.ISummary[];
  };
}
