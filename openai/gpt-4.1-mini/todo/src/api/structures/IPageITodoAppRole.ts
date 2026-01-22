import { IPage } from "./IPage";
import { ITodoAppRole } from "./ITodoAppRole";

export namespace IPageITodoAppRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppRole.ISummary[];
  };
}
