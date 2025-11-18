import { IPage } from "./IPage";
import { ITodoListUserEmailVerification } from "./ITodoListUserEmailVerification";

export namespace IPageITodoListUserEmailVerification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListUserEmailVerification.ISummary[];
  };
}
