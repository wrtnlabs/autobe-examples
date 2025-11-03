import { IPage } from "./IPage";
import { ITodoAppTaskSnapshot } from "./ITodoAppTaskSnapshot";

export namespace IPageITodoAppTaskSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppTaskSnapshot.ISummary[];
  };
}
