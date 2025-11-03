import { IPage } from "./IPage";
import { ITodoAppTaskCompletionByDay } from "./ITodoAppTaskCompletionByDay";

export namespace IPageITodoAppTaskCompletionByDay {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTaskCompletionByDay.ISummary[];
  };
}
