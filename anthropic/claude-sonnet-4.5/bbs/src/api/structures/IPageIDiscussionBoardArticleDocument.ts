import { IPage } from "./IPage";
import { IDiscussionBoardArticleDocument } from "./IDiscussionBoardArticleDocument";

export namespace IPageIDiscussionBoardArticleDocument {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleDocument.ISummary[];
  };
}
