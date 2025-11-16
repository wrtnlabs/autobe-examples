import { IPage } from "./IPage";
import { ITodoListUserSession } from "./ITodoListUserSession";

export namespace IPageITodoListUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUserSession.ISummary[];
  };
}
