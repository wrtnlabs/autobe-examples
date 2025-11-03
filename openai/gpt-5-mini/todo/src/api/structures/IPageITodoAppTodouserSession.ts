import { IPage } from "./IPage";
import { ITodoAppTodouserSession } from "./ITodoAppTodouserSession";

export namespace IPageITodoAppTodouserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTodouserSession.ISummary[];
  };
}
