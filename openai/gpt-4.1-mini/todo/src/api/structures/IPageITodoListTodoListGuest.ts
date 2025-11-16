import { IPage } from "./IPage";
import { ITodoListTodoListGuest } from "./ITodoListTodoListGuest";

export namespace IPageITodoListTodoListGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodoListGuest.ISummary[];
  };
}
