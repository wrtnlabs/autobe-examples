import { IPage } from "./IPage";
import { ITodoAppUserRole } from "./ITodoAppUserRole";

export namespace IPageITodoAppUserRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUserRole.ISummary[];
  };
}
