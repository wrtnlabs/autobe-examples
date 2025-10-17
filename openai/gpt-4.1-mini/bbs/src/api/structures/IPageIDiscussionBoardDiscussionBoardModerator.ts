import { IPage } from "./IPage";
import { IDiscussionBoardDiscussionBoardModerator } from "./IDiscussionBoardDiscussionBoardModerator";

export namespace IPageIDiscussionBoardDiscussionBoardModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardDiscussionBoardModerator.ISummary[];
  };
}
