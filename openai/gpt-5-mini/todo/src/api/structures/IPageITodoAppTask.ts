import { IPage } from "./IPage";
import { ITodoAppTask } from "./ITodoAppTask";

export namespace IPageITodoAppTask {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTask.ISummary[];
  };
}
