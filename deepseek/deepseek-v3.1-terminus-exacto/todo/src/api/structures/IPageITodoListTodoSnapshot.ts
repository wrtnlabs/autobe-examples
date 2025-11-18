import { IPage } from "./IPage";
import { ITodoListTodoSnapshot } from "./ITodoListTodoSnapshot";

export namespace IPageITodoListTodoSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListTodoSnapshot.ISummary[];
  };
}
