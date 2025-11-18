import { IPage } from "./IPage";
import { ITodoAppMemberuserSession } from "./ITodoAppMemberuserSession";

export namespace IPageITodoAppMemberuserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppMemberuserSession.ISummary[];
  };
}
