import { IPage } from "./IPage";
import { ITodoListUserSession } from "./ITodoListUserSession";

export namespace IPageITodoListUserSession {
  /**
   * Paginated response containing a collection of user session summaries.
   *
   * This schema defines the standard paginated response structure for user
   * session listing operations. It wraps an array of session summary records
   * with pagination metadata, enabling efficient browsing of potentially
   * large session collections through controlled page-based data retrieval.
   *
   * The response combines session data from the todo_list_user_sessions table
   * with pagination information following the standard IPage pattern used
   * throughout the API. This structure supports both user self-service
   * session management (viewing own active sessions across devices) and
   * administrative security monitoring (reviewing user sessions for support
   * and security purposes).
   *
   * Used as the response body for PATCH operations on session listing
   * endpoints, where the request body contains search filters and pagination
   * parameters. The pagination wrapper enables clients to navigate through
   * results, display page controls, and show total result counts to users.
   * Each page contains up to the specified limit of session records, with the
   * data array potentially empty when no sessions match the filter criteria
   * or when requesting a page beyond the available data range.
   *
   * This paginated structure is essential for scalable session management
   * interfaces that need to handle users with multiple concurrent sessions
   * across different devices and time periods.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the user session listing response.
     *
     * Provides comprehensive pagination information including the current
     * page number, page size limit, total number of session records
     * matching the query criteria, and the total number of pages available.
     * This metadata enables clients to render pagination controls, navigate
     * between pages, and display result statistics to users.
     *
     * The pagination object follows the standard IPage.IPagination schema
     * structure used consistently across all paginated endpoints in the
     * API. Clients use these values to construct subsequent page requests
     * by adjusting the page parameter in their queries.
     *
     * Essential for user interfaces that display session listings with
     * navigation controls, allowing users to browse through potentially
     * large collections of active authentication sessions across multiple
     * devices and time periods.
     */
    pagination: IPage.IPagination;

    /**
     * Array of user session summary records for the current page.
     *
     * Contains the actual session data retrieved from the
     * todo_list_user_sessions table, with each element representing an
     * active or expired authentication session. Each session summary
     * includes essential information such as session ID, user reference, IP
     * address, connection URLs (href and referrer), creation timestamp, and
     * expiration status.
     *
     * The number of elements in this array will be less than or equal to
     * the pagination.limit value, with the final page potentially
     * containing fewer records than the limit. An empty array indicates no
     * sessions match the current filter criteria for this page.
     *
     * Each session record provides sufficient information for security
     * monitoring displays, enabling users to identify active sessions
     * across different devices and locations, monitor session age, and
     * detect suspicious login patterns. The summary variant is optimized
     * for list views while excluding detailed authentication token
     * information.
     */
    data: ITodoListUserSession.ISummary[];
  };
}
