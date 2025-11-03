import { IPage } from "./IPage";
import { ITodoItem } from "./ITodoItem";

export namespace IPageITodoItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoItem.ISummary[];
  };
}
