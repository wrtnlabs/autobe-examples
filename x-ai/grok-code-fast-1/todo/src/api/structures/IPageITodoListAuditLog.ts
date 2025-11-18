import { IPage } from "./IPage";
import { ITodoListAuditLog } from "./ITodoListAuditLog";

export namespace IPageITodoListAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListAuditLog.ISummary[];
  };
}
