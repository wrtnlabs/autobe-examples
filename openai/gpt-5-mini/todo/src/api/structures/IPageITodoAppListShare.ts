import { IPage } from "./IPage";
import { ITodoAppListShare } from "./ITodoAppListShare";

export namespace IPageITodoAppListShare {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppListShare.ISummary[];
  };
}
