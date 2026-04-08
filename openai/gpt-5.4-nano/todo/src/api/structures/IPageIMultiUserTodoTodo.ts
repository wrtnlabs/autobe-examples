import { IMultiUserTodoTodo } from "./IMultiUserTodoTodo";
import { IPageIMultiUserTodoUserProfile } from "./IPageIMultiUserTodoUserProfile";

export namespace IPageIMultiUserTodoTodo {
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
     * @x-autobe-specification List of records of type IMultiUserTodoTodo.ISummary.
     */
    data: IMultiUserTodoTodo.ISummary[];
  };
}
