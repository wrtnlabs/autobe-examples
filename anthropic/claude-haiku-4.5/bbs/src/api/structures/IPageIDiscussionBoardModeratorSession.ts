import { IPage } from "./IPage";
import { IDiscussionBoardModeratorSession } from "./IDiscussionBoardModeratorSession";

export namespace IPageIDiscussionBoardModeratorSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModeratorSession.ISummary[];
  };
}
