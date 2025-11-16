import { IPage } from "./IPage";
import { ITodoAppTodoPriority } from "./ITodoAppTodoPriority";

export namespace IPageITodoAppTodoPriority {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTodoPriority.ISummary[];
  };
}
