import { IPage } from "./IPage";
import { ITodoAppTodoStatus } from "./ITodoAppTodoStatus";

export namespace IPageITodoAppTodoStatus {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTodoStatus.ISummary[];
  };
}
