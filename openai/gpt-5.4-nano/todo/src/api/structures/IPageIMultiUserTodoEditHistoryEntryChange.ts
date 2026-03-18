import { IMultiUserTodoEditHistoryEntryChange } from "./IMultiUserTodoEditHistoryEntryChange";
import { IPageIMultiUserTodo } from "./IPageIMultiUserTodo";

export namespace IPageIMultiUserTodoEditHistoryEntryChange {
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
    pagination: IPageIMultiUserTodo.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IMultiUserTodoEditHistoryEntryChange.ISummary.
     */
    data: IMultiUserTodoEditHistoryEntryChange.ISummary[];
  };
}
