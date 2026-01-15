import { IPage } from "./IPage";
import { IDiscussionBoardArticleCommentReply } from "./IDiscussionBoardArticleCommentReply";

export namespace IPageIDiscussionBoardArticleCommentReply {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleCommentReply.ISummary[];
  };
}
