import { IPage } from "./IPage";
import { IDiscussionBoardArticleImage } from "./IDiscussionBoardArticleImage";

export namespace IPageIDiscussionBoardArticleImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleImage.ISummary[];
  };
}
