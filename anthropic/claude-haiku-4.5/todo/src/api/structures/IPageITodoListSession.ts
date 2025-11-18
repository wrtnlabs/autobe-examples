import { IPage } from "./IPage";
import { ITodoListSession } from "./ITodoListSession";

export namespace IPageITodoListSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListSession.ISummary[];
  };
}
