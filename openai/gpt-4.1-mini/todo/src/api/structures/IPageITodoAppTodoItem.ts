import { IPage } from "./IPage";
import { ITodoAppTodoItem } from "./ITodoAppTodoItem";

export namespace IPageITodoAppTodoItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTodoItem.ISummary[];
  };
}
