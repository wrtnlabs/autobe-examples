import { IPage } from "./IPage";
import { ITodoListUser } from "./ITodoListUser";

export namespace IPageITodoListUser {
  /**
   * Paginated collection of registered user account summaries.
   *
   * This response type wraps a filtered and sorted list of user accounts from
   * the todo_list_users table with pagination metadata. It represents the
   * result of search and filter operations on user data, providing both the
   * matching user records and information needed to navigate through multiple
   * pages of results.
   *
   * The pagination wrapper enables efficient handling of potentially large
   * user datasets by dividing results into manageable pages. Each page
   * contains a subset of user summary records along with metadata indicating
   * the current page position, total record count, and available pages for
   * navigation.
   *
   * Used as the response type for administrative user search operations where
   * administrators query and browse registered user accounts. The summary
   * records contain essential user information optimized for list displays
   * while excluding sensitive fields like password hashes, tokens, and
   * detailed session information.
   *
   * This structure supports administrative dashboards, user management
   * interfaces, analytics views, and account monitoring operations where
   * administrators need to view, search, filter, and analyze user accounts
   * with proper pagination controls and performance optimization.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUser.ISummary[];
  };
}
