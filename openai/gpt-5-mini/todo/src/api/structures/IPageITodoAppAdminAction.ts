import { IPage } from "./IPage";
import { ITodoAppAdminAction } from "./ITodoAppAdminAction";

export namespace IPageITodoAppAdminAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdminAction.ISummary[];
  };
}
