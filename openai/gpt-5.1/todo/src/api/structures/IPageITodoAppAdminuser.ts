import { IPage } from "./IPage";
import { ITodoAppAdminUser } from "./ITodoAppAdminUser";

export namespace IPageITodoAppAdminUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAdminUser.ISummary[];
  };
}
