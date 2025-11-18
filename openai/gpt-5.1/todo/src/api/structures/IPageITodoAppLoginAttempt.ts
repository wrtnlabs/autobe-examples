import { IPage } from "./IPage";
import { ITodoAppLoginAttempt } from "./ITodoAppLoginAttempt";

export namespace IPageITodoAppLoginAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppLoginAttempt.ISummary[];
  };
}
