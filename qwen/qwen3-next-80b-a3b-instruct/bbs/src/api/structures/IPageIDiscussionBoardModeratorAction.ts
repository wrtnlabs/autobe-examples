import { IPage } from "./IPage";
import { IDiscussionBoardModeratorAction } from "./IDiscussionBoardModeratorAction";

export namespace IPageIDiscussionBoardModeratorAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModeratorAction.ISummary[];
  };
}
