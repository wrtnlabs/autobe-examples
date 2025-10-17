import { IPage } from "./IPage";
import { ITodoListTasks } from "./ITodoListTasks";

export namespace IPageITodoListTasks {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTasks.ISummary[];
  };
}
