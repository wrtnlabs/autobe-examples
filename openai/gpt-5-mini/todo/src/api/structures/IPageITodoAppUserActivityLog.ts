import { IPage } from "./IPage";
import { ITodoAppUserActivityLog } from "./ITodoAppUserActivityLog";

export namespace IPageITodoAppUserActivityLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUserActivityLog.ISummary[];
  };
}
