import { IPage } from "./IPage";
import { ITodoTask } from "./ITodoTask";

export namespace IPageITodoTask {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoTask.ISummary[];
  };
}
