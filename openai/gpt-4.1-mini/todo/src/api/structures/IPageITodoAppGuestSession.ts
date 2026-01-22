import { IPage } from "./IPage";
import { ITodoAppGuestSession } from "./ITodoAppGuestSession";

export namespace IPageITodoAppGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppGuestSession.ISummary[];
  };
}
