import { IPage } from "./IPage";
import { IDiscussionBoardModerationQueue } from "./IDiscussionBoardModerationQueue";

export namespace IPageIDiscussionBoardModerationQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerationQueue.ISummary[];
  };
}
