import { IMultiUserTodoTodoEditHistoryEntry } from "./IMultiUserTodoTodoEditHistoryEntry";
import { IPageIMultiUserTodoUserProfile } from "./IPageIMultiUserTodoUserProfile";

export namespace IPageIMultiUserTodoTodoEditHistoryEntry {
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
    pagination: IPageIMultiUserTodoUserProfile.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IMultiUserTodoTodoEditHistoryEntry.ISummary.
     */
    data: IMultiUserTodoTodoEditHistoryEntry.ISummary[];
  };
}
