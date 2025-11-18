import { IPage } from "./IPage";
import { ITodoListCategory } from "./ITodoListCategory";

export namespace IPageITodoListCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListCategory.ISummary[];
  };
}
