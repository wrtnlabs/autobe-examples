import { IPage } from "./IPage";
import { IDiscussionBoardMemberSession } from "./IDiscussionBoardMemberSession";

export namespace IPageIDiscussionBoardMemberSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardMemberSession.ISummary[];
  };
}
