import { IPage } from "./IPage";
import { ITodoListAdmin } from "./ITodoListAdmin";

export namespace IPageITodoListAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListAdmin.ISummary[];
  };
}
