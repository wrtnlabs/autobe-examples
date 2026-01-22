import { IPage } from "./IPage";
import { ITodoAppUserPasswordReset } from "./ITodoAppUserPasswordReset";

export namespace IPageITodoAppUserPasswordReset {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUserPasswordReset.ISummary[];
  };
}
