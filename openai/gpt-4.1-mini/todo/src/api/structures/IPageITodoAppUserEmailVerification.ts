import { IPage } from "./IPage";
import { ITodoAppUserEmailVerification } from "./ITodoAppUserEmailVerification";

export namespace IPageITodoAppUserEmailVerification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUserEmailVerification.ISummary[];
  };
}
