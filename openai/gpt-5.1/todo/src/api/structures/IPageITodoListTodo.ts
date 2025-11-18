import { IPage } from "./IPage";
import { ITodoListTodo } from "./ITodoListTodo";

export namespace IPageITodoListTodo {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodo.ISummary[];
  };
}
