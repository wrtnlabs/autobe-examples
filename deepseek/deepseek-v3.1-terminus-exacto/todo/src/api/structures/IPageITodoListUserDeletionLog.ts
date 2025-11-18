import { IPage } from "./IPage";
import { ITodoListUserDeletionLog } from "./ITodoListUserDeletionLog";

export namespace IPageITodoListUserDeletionLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUserDeletionLog.ISummary[];
  };
}
