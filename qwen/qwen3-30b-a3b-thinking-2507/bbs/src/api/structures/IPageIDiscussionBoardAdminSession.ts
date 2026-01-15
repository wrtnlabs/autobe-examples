import { IPage } from "./IPage";
import { IDiscussionBoardAdminSession } from "./IDiscussionBoardAdminSession";

export namespace IPageIDiscussionBoardAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAdminSession.ISummary[];
  };
}
