import { IPage } from "./IPage";
import { IDiscussionBoardArticleAttachment } from "./IDiscussionBoardArticleAttachment";

export namespace IPageIDiscussionBoardArticleAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleAttachment.ISummary[];
  };
}
