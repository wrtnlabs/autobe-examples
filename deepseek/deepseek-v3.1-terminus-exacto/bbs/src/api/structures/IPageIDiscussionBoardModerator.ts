import { IPage } from "./IPage";
import { IDiscussionBoardModerator } from "./IDiscussionBoardModerator";

export namespace IPageIDiscussionBoardModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerator.ISummary[];
  };
}
