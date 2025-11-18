import { IPage } from "./IPage";
import { ITodoAppAdminuserSession } from "./ITodoAppAdminuserSession";

export namespace IPageITodoAppAdminuserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdminuserSession.ISummary[];
  };
}
