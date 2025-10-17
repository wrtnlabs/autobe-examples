import { IPage } from "./IPage";
import { ITodoAppAdmin } from "./ITodoAppAdmin";

export namespace IPageITodoAppAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdmin.ISummary[];
  };
}
