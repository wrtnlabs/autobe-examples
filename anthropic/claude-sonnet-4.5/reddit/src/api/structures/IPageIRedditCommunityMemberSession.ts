import { IPage } from "./IPage";
import { IRedditCommunityMemberSession } from "./IRedditCommunityMemberSession";

export namespace IPageIRedditCommunityMemberSession {
  /**
   * Paginated response containing member authentication session summaries.
   *
   * This wrapper type encapsulates a page of member session records along
   * with pagination metadata, enabling efficient browsing through potentially
   * large session histories. It follows the standard pagination pattern used
   * throughout the Reddit Community API for consistent list response
   * handling.
   *
   * Used in member session management endpoints to return filtered and sorted
   * session lists. The pagination information allows clients to implement
   * page-based navigation controls, while the data array contains the actual
   * session summaries for display in security dashboards, session management
   * interfaces, and audit trail views.
   *
   * Typically returned from operations that retrieve member authentication
   * sessions, supporting use cases such as reviewing active login sessions
   * across devices, monitoring security events, tracking session lifecycle
   * for compliance, and enabling users to manage their authenticated
   * connections.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the member session list.
     *
     * Contains comprehensive pagination information including current page
     * number, records per page limit, total record count in the database,
     * and total page count. This metadata enables clients to implement
     * pagination controls, display page indicators, and navigate through
     * the complete session history efficiently.
     *
     * Essential for building user interfaces that allow browsing through
     * potentially large numbers of authentication sessions across multiple
     * pages.
     */
    pagination: IPage.IPagination;

    /**
     * Array of member authentication session summary records for the
     * current page.
     *
     * Contains the actual session data matching the request filters and
     * pagination parameters. Each item is a summary representation of an
     * authentication session including session identifier, member
     * reference, connection context (IP address, URLs), and creation
     * timestamp.
     *
     * This array may be empty if no sessions match the filter criteria or
     * if the requested page is beyond the available data range. The array
     * length will not exceed the limit specified in the pagination
     * parameters.
     */
    data: IRedditCommunityMemberSession.ISummary[];
  };
}
