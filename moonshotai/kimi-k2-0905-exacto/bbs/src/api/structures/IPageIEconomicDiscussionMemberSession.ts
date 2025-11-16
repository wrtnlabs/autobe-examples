import { IPage } from "./IPage";
import { IEconomicDiscussionMemberSession } from "./IEconomicDiscussionMemberSession";

export namespace IPageIEconomicDiscussionMemberSession {
  /**
   * Paginated response containing member authentication session summaries for
   * security monitoring and account access auditing.
   *
   * This wrapper structures session history data with comprehensive
   * pagination controls, enabling members to systematically review their
   * login history and identify potential security issues. The format supports
   * security audit workflows by providing chronological session information
   * with contextual metadata.
   *
   * The pagination system allows members to browse through extensive session
   * histories efficiently while maintaining clear navigation context. Session
   * summaries include essential security information (IP addresses,
   * timestamps, connection details) necessary for identifying unauthorized
   * access attempts and monitoring account security without exposing
   * sensitive authentication tokens or detailed connection metadata.
   */
  export type ISummary = {
    /**
     * Complete pagination metadata for session history browsing. Provides
     * current page context, total available pages, results per page
     * configuration, and total session record count to enable systematic
     * navigation through authentication audit trails.
     */
    pagination: IPage.IPagination;

    /**
     * Chronological array of member authentication sessions with security
     * audit information. Each session summary includes session identifiers,
     * IP addresses, connection context, creation timestamps, and expiration
     * times for comprehensive security monitoring and account access
     * review.
     */
    data: IEconomicDiscussionMemberSession.ISummary[];
  };
}
