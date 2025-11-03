import { IPage } from "./IPage";
import { ITodoAppList } from "./ITodoAppList";

export namespace IPageITodoAppList {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppList.ISummary[];
  };
}
