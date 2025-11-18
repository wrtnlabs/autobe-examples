import { IPage } from "./IPage";
import { ITodoListPasswordResetToken } from "./ITodoListPasswordResetToken";

export namespace IPageITodoListPasswordResetToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListPasswordResetToken.ISummary[];
  };
}
