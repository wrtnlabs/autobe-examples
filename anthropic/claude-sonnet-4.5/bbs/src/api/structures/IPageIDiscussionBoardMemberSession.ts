import { IPage } from "./IPage";
import { IDiscussionBoardMemberSession } from "./IDiscussionBoardMemberSession";

export namespace IPageIDiscussionBoardMemberSession {
  /**
   * Paginated response containing member authentication session summaries.
   *
   * This response type wraps a collection of member session records with
   * pagination metadata, enabling efficient retrieval and navigation of large
   * session lists. Used when members need to review all their active login
   * sessions across different devices, browsers, and locations for security
   * monitoring and session management purposes.
   *
   * The pagination structure allows clients to navigate through session
   * history without loading all records at once, which is critical for
   * members with many active or historical sessions. Each page contains
   * session summary information optimized for session management interfaces,
   * including essential identification details, connection metadata, and
   * creation timestamps.
   *
   * This paginated response is returned by session search and filtering
   * operations, supporting complex queries based on IP address, user agent,
   * creation date ranges, and other session attributes. The response
   * structure ensures consistent pagination behavior across all
   * session-related endpoints in the discussion board system.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardMemberSession.ISummary[];
  };
}
