import { IPage } from "./IPage";
import { ITodoListUserPasswordReset } from "./ITodoListUserPasswordReset";

export namespace IPageITodoListUserPasswordReset {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUserPasswordReset.ISummary[];
  };
}
