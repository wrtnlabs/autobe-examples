import { IPage } from "./IPage";
import { ITodoListUserTodo } from "./ITodoListUserTodo";

export namespace IPageITodoListUserTodo {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUserTodo.ISummary[];
  };
}
