import { IPage } from "./IPage";
import { ITodoAppGuest } from "./ITodoAppGuest";

export namespace IPageITodoAppGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppGuest.ISummary[];
  };
}
