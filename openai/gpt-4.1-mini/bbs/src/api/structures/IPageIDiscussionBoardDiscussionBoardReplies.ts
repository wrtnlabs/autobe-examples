import { IPage } from "./IPage";
import { IDiscussionBoardDiscussionBoardReplies } from "./IDiscussionBoardDiscussionBoardReplies";

export namespace IPageIDiscussionBoardDiscussionBoardReplies {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardDiscussionBoardReplies.ISummary[];
  };
}
