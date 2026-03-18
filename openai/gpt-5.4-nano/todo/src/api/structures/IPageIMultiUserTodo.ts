import { IMultiUserTodo } from "./IMultiUserTodo";
import { IPage } from "./IPage";

export namespace IPageIMultiUserTodo {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IPagination = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IMultiUserTodoTodo.IPagination.
     */
    data: IMultiUserTodo.IPagination[];
  };

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
     * @x-autobe-specification List of records of type IMultiUserTodoTodo.ISummary.
     */
    data: IMultiUserTodo.ISummary[];
  };
}
