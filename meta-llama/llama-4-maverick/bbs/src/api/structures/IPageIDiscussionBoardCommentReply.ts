import { IPage } from "./IPage";
import { IDiscussionBoardCommentReply } from "./IDiscussionBoardCommentReply";

export namespace IPageIDiscussionBoardCommentReply {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardCommentReply.ISummary[];
  };
}
