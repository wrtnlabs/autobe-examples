import { IMultiUserTodoHistory } from "./IMultiUserTodoHistory";
import { IPage } from "./IPage";

export namespace IPageIMultiUserTodoHistory {
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
     * @x-autobe-specification List of records of type IMultiUserTodoHistory.ISummary.
     */
    data: IMultiUserTodoHistory.ISummary[];
  };
}
