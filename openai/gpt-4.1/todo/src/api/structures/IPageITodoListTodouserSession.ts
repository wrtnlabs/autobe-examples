import { IPage } from "./IPage";
import { ITodoListTodouserSession } from "./ITodoListTodouserSession";

export namespace IPageITodoListTodouserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodouserSession.ISummary[];
  };
}
