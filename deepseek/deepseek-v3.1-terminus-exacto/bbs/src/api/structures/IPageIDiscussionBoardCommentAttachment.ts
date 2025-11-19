import { IPage } from "./IPage";
import { IDiscussionBoardCommentAttachment } from "./IDiscussionBoardCommentAttachment";

export namespace IPageIDiscussionBoardCommentAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardCommentAttachment.ISummary[];
  };
}
