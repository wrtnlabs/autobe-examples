import { IPage } from "./IPage";
import { ITodoListUser } from "./ITodoListUser";

export namespace IPageITodoListUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUser.ISummary[];
  };
}
