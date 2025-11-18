import { IPage } from "./IPage";
import { ITodoListGuestSession } from "./ITodoListGuestSession";

export namespace IPageITodoListGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListGuestSession.ISummary[];
  };
}
