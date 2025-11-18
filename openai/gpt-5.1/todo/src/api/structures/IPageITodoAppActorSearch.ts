import { IPage } from "./IPage";
import { ITodoAppActorSearch } from "./ITodoAppActorSearch";

export namespace IPageITodoAppActorSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppActorSearch.ISummary[];
  };
}
