import { IPage } from "./IPage";
import { ITodoAppAuditLog } from "./ITodoAppAuditLog";

export namespace IPageITodoAppAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAuditLog.ISummary[];
  };
}
