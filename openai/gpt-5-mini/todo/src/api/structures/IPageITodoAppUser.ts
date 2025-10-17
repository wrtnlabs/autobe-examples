import { IPage } from "./IPage";
import { ITodoAppUser } from "./ITodoAppUser";

export namespace IPageITodoAppUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppUser.ISummary[];
  };
}
