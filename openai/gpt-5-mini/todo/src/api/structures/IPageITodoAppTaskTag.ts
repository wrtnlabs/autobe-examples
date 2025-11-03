import { IPage } from "./IPage";
import { ITodoAppTaskTag } from "./ITodoAppTaskTag";

export namespace IPageITodoAppTaskTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTaskTag.ISummary[];
  };
}
