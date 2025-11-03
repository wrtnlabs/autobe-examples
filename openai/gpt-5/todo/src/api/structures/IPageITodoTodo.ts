import { IPage } from "./IPage";
import { ITodoTodo } from "./ITodoTodo";

export namespace IPageITodoTodo {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoTodo.ISummary[];
  };
}
