import { IPage } from "./IPage";
import { IDiscussionBoardModerationAction } from "./IDiscussionBoardModerationAction";

export namespace IPageIDiscussionBoardModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerationAction.ISummary[];
  };
}
