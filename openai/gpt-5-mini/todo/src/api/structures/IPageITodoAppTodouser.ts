import { IPage } from "./IPage";
import { ITodoAppTodoUser } from "./ITodoAppTodoUser";

export namespace IPageITodoAppTodouser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTodoUser.ISummary[];
  };
}
