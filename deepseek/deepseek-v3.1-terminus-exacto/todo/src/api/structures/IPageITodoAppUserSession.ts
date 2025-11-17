import { IPage } from "./IPage";
import { ITodoAppUserSession } from "./ITodoAppUserSession";

export namespace IPageITodoAppUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUserSession.ISummary[];
  };
}
