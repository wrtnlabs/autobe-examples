import { IPage } from "./IPage";
import { ITodoListAdmin } from "./ITodoListAdmin";

export namespace IPageITodoListAdmin {
  /**
   * Paginated collection of system administrator account summaries.
   *
   * This response type wraps a filtered and sorted list of administrator
   * accounts from the todo_list_admins table with pagination metadata. It
   * represents the result of search and filter operations on administrator
   * data, providing both the matching administrator records and information
   * needed to navigate through multiple pages of results.
   *
   * The pagination wrapper enables efficient handling of large administrator
   * datasets by dividing results into manageable pages. Each page contains a
   * subset of administrator summary records along with metadata indicating
   * the current page position, total record count, and available pages.
   *
   * Used as the response type for administrative search operations where
   * administrators query and browse the system's administrator accounts. The
   * summary records contain essential administrator information optimized for
   * list displays, excluding sensitive fields like password hashes.
   *
   * This structure supports administrative dashboards, user management
   * interfaces, and audit operations where administrators need to view,
   * search, and manage other administrator accounts with proper pagination
   * controls.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListAdmin.ISummary[];
  };
}
