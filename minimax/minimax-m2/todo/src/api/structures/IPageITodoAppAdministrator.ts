import { IPage } from "./IPage";
import { ITodoAppAdministrator } from "./ITodoAppAdministrator";

export namespace IPageITodoAppAdministrator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdministrator.ISummary[];
  };
}
