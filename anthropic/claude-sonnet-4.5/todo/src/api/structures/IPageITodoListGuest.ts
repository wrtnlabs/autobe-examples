import { IPage } from "./IPage";
import { ITodoListGuest } from "./ITodoListGuest";

export namespace IPageITodoListGuest {
  /**
   * Paginated response containing guest visitor summaries.
   *
   * This type represents a page of guest visitor records from the
   * todo_list_guests table, combining pagination metadata with an array of
   * guest summaries. It follows the standard IPage pattern used throughout
   * the API for consistent paginated responses.
   *
   * The pagination wrapper enables efficient retrieval of guest visitor data
   * when analyzing traffic patterns or monitoring unauthenticated access.
   * This is essential for administrative analytics where large volumes of
   * visitor data need to be processed in manageable chunks.
   *
   * Used exclusively in administrative operations as the response type for
   * guest visitor search and analytics endpoints. The data array contains
   * ITodoListGuest.ISummary objects with essential visitor tracking
   * information, while the pagination object enables navigation through
   * potentially large datasets of visitor records. This structure supports
   * comprehensive visitor analytics while maintaining performance and
   * usability.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains metadata about the current page, total records, and
     * pagination state for navigating through guest visitor results.
     */
    pagination: IPage.IPagination;

    /**
     * List of guest visitor summaries.
     *
     * Array of ITodoListGuest.ISummary objects representing unauthenticated
     * visitors that match the search criteria. Each summary contains
     * essential tracking information including guest identifier, IP
     * address, and visit timestamp.
     */
    data: ITodoListGuest.ISummary[];
  };
}
