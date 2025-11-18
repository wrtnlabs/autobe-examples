import { IPage } from "./IPage";
import { ITodoUser } from "./ITodoUser";

export namespace IPageITodoUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoUser.ISummary[];
  };
}
