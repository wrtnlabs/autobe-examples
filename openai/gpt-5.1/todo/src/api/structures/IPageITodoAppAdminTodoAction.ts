import { IPage } from "./IPage";
import { ITodoAppAdminTodoAction } from "./ITodoAppAdminTodoAction";

export namespace IPageITodoAppAdminTodoAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdminTodoAction.ISummary[];
  };
}
