import { IPage } from "./IPage";
import { ITodoAuditEvent } from "./ITodoAuditEvent";

export namespace IPageITodoAuditEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAuditEvent.ISummary[];
  };
}
