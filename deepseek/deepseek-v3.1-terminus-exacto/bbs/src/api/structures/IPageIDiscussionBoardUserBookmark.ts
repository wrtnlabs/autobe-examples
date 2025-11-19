import { IPage } from "./IPage";
import { IDiscussionBoardUserBookmark } from "./IDiscussionBoardUserBookmark";

export namespace IPageIDiscussionBoardUserBookmark {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardUserBookmark.ISummary[];
  };
}
