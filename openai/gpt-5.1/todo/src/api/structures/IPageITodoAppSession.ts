import { IPage } from "./IPage";
import { ITodoAppSession } from "./ITodoAppSession";

export namespace IPageITodoAppSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppSession.ISummary[];
  };
}
