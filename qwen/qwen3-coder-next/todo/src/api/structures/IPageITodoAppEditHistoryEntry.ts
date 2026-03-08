import { IPage } from "./IPage";
import { ITodoAppEditHistoryEntry } from "./ITodoAppEditHistoryEntry";

export namespace IPageITodoAppEditHistoryEntry {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type ITodoAppEditHistoryEntry.ISummary.
     */
    data: ITodoAppEditHistoryEntry.ISummary[];
  };
}
