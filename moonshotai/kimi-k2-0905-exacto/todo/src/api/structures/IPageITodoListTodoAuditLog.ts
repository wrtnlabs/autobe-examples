import { IPage } from "./IPage";
import { ITodoListTodoAuditLog } from "./ITodoListTodoAuditLog";

export namespace IPageITodoListTodoAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodoAuditLog.ISummary[];
  };
}
