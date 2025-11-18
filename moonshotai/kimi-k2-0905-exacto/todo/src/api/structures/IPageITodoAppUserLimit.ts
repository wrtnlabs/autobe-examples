import { IPage } from "./IPage";
import { ITodoAppUserLimit } from "./ITodoAppUserLimit";

export namespace IPageITodoAppUserLimit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUserLimit.ISummary[];
  };
}
