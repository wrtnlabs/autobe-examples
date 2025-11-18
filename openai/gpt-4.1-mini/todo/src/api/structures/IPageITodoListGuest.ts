import { IPage } from "./IPage";
import { ITodoListGuest } from "./ITodoListGuest";

export namespace IPageITodoListGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListGuest.ISummary[];
  };
}
