import { IPage } from "./IPage";
import { ITodoAppMemberUser } from "./ITodoAppMemberUser";

export namespace IPageITodoAppMemberUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppMemberUser.ISummary[];
  };
}
