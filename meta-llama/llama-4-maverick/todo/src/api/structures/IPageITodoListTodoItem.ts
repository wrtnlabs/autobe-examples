import { IPage } from "./IPage";
import { ITodoListTodoItem } from "./ITodoListTodoItem";

export namespace IPageITodoListTodoItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodoItem.ISummary[];
  };
}
