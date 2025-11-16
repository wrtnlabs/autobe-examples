import { IPage } from "./IPage";
import { IDiscussionBoardModeratorSession } from "./IDiscussionBoardModeratorSession";

export namespace IPageIDiscussionBoardModeratorSession {
  /**
   * Paginated response containing moderator authentication session summaries.
   *
   * This wrapper type encapsulates a paginated list of moderator session
   * summaries along with pagination metadata, following the standard page
   * response pattern used throughout the API. It provides both the session
   * data for the current page and the pagination information needed to
   * navigate through the complete result set.
   *
   * Used as the response type for session list operations where moderators or
   * administrators query authentication sessions with search, filtering, and
   * pagination capabilities. The structure separates pagination metadata from
   * the actual data array, enabling clients to render pagination controls
   * independently from the session list.
   *
   * This design supports efficient navigation through potentially large
   * session result sets while maintaining optimal response sizes and server
   * performance. Clients can use the pagination metadata to implement page
   * navigation controls, display result counts, and manage infinite scrolling
   * or load-more interfaces.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the moderator session list.
     *
     * Provides comprehensive pagination information including current page
     * number, records per page limit, total record count in the database,
     * and total page count. This metadata enables clients to implement
     * pagination controls, display page indicators, and navigate through
     * large session result sets efficiently.
     *
     * The pagination object follows standard patterns used across all
     * paginated endpoints in the system, ensuring consistent pagination
     * behavior and user experience throughout the API.
     */
    pagination: IPage.IPagination;

    /**
     * Array of moderator session summaries matching the search criteria.
     *
     * Contains the actual session records for the current page, with each
     * element representing a lightweight summary of a moderator
     * authentication session. The array length will be at most equal to the
     * pagination limit, and may be less on the final page or when fewer
     * records match the search criteria.
     *
     * Each session summary includes essential session identification (ID,
     * moderator ID, creation timestamp) optimized for list displays and
     * administrative dashboards. For complete session details including
     * connection metadata, retrieve individual sessions via dedicated
     * endpoints.
     */
    data: IDiscussionBoardModeratorSession.ISummary[];
  };
}
