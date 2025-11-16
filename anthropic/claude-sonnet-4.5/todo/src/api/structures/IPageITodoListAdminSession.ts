import { IPage } from "./IPage";
import { ITodoListAdminSession } from "./ITodoListAdminSession";

export namespace IPageITodoListAdminSession {
  /**
   * Paginated collection of administrator session summary records.
   *
   * This response type wraps a list of admin authentication sessions with
   * pagination metadata, enabling efficient browsing through potentially
   * large sets of administrator session data. Used primarily in
   * administrative security monitoring interfaces and session management
   * endpoints.
   *
   * The pagination wrapper provides essential navigation information
   * including current page number, total record count, page size limits, and
   * total page count. This enables client applications to implement
   * pagination controls for navigating through admin session history.
   *
   * Typically returned by administrator session listing operations that
   * support filtering by creation date, IP address, session status, or other
   * security-relevant criteria. Critical for security auditing workflows
   * where administrators need to review and monitor authentication patterns
   * across the administrative user base.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListAdminSession.ISummary[];
  };
}
