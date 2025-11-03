import { IPage } from "./IPage";
import { ITodoAppSearchResult } from "./ITodoAppSearchResult";

export namespace IPageITodoAppSearchResult {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppSearchResult.ISummary[];
  };
}
