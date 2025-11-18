import { IPage } from "./IPage";
import { ITodoListAdminDeletionLog } from "./ITodoListAdminDeletionLog";

export namespace IPageITodoListAdminDeletionLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListAdminDeletionLog.ISummary[];
  };
}
