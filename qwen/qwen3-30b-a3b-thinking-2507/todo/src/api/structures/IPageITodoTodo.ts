import { IPage } from "./IPage";
import { ITodoTodo } from "./ITodoTodo";

export namespace IPageITodoTodo {
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
     * @x-autobe-specification List of records of type ITodoTodo.ISummary.
     */
    data: ITodoTodo.ISummary[];
  };
}
