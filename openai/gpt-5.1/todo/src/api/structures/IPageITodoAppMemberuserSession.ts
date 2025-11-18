import { IPage } from "./IPage";
import { ITodoAppMemberUserSession } from "./ITodoAppMemberUserSession";

export namespace IPageITodoAppMemberUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppMemberUserSession.ISummary[];
  };
}
