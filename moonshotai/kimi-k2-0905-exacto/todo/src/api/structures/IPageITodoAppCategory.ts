import { IPage } from "./IPage";
import { ITodoAppCategory } from "./ITodoAppCategory";

export namespace IPageITodoAppCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppCategory.ISummary[];
  };
}
