import { IPage } from "./IPage";
import { IDiscussionBoardAdminuserSession } from "./IDiscussionBoardAdminuserSession";

export namespace IPageIDiscussionBoardAdminuserSession {
  /**
   * Paginated collection of administrator session summaries.
   *
   * Wraps a page of admin session summary DTOs together with pagination
   * metadata, enabling secure and efficient browsing of administrative
   * session history without exposing any sensitive authentication material.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Provides the current page, total record count, total page count, and
     * page size for an administrator session listing. This allows
     * administrative tools to navigate through large sets of admin sessions
     * in a predictable and efficient way.
     */
    pagination: IPage.IPagination;

    /**
     * List of administrator session summary records on the current page.
     *
     * Each element is a summary projection of a single session from the
     * discussion_board_adminuser_sessions table, exposing only
     * non-sensitive metadata needed for monitoring and audit dashboards.
     */
    data: IDiscussionBoardAdminuserSession.ISummary[];
  };
}
