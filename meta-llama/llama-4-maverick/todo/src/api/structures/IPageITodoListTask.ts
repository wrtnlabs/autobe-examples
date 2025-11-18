import { IPage } from "./IPage";
import { ITodoListTask } from "./ITodoListTask";

export namespace IPageITodoListTask {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTask.ISummary[];
  };
}
