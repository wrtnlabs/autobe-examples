import { IPage } from "./IPage";
import { ITodoAppAccessToken } from "./ITodoAppAccessToken";

export namespace IPageITodoAppAccessToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppAccessToken.ISummary[];
  };
}
