import { IPage } from "./IPage";
import { ITodoAppAdminSession } from "./ITodoAppAdminSession";

export namespace IPageITodoAppAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdminSession.ISummary[];
  };
}
