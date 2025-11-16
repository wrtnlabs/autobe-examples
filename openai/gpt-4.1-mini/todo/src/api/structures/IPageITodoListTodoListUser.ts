import { IPage } from "./IPage";
import { ITodoListTodoListUser } from "./ITodoListTodoListUser";

export namespace IPageITodoListTodoListUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodoListUser.ISummary[];
  };
}
