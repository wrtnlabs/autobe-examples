import { IPage } from "./IPage";
import { IMinimalTodoTodo } from "./IMinimalTodoTodo";

export namespace IPageIMinimalTodoTodo {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IMinimalTodoTodo.ISummary[];
  };
}
