import { IPage } from "./IPage";
import { ITodoAppGuestUser } from "./ITodoAppGuestUser";

export namespace IPageITodoAppGuestuser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppGuestUser.ISummary[];
  };
}
