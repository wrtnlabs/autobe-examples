import { IPage } from "./IPage";
import { ITodoListPasswordReset } from "./ITodoListPasswordReset";

export namespace IPageITodoListPasswordReset {
  /**
   * Paginated response containing password reset request summaries.
   *
   * This type represents a page of password reset records from the
   * todo_list_password_resets table, combining pagination metadata with an
   * array of password reset summaries. It follows the standard IPage pattern
   * used throughout the API for consistent paginated responses.
   *
   * The pagination wrapper enables efficient retrieval of password reset
   * requests when there are many records, allowing clients to navigate
   * through results page by page. This is particularly important for
   * administrative monitoring where users or administrators may need to
   * review historical reset requests.
   *
   * Used as the response type for password reset search operations, providing
   * both the requested data and the information needed to navigate through
   * multiple pages of results. The data array contains
   * ITodoListPasswordReset.ISummary objects with essential reset token
   * information, while the pagination object tracks current page, total
   * records, and total pages.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains metadata about the current page, total records, and
     * pagination state for navigating through password reset request
     * results.
     */
    pagination: IPage.IPagination;

    /**
     * List of password reset request summaries.
     *
     * Array of ITodoListPasswordReset.ISummary objects representing
     * password reset tokens that match the search criteria. Each summary
     * contains essential information about reset requests including token
     * status, expiration time, and creation timestamp.
     */
    data: ITodoListPasswordReset.ISummary[];
  };
}
