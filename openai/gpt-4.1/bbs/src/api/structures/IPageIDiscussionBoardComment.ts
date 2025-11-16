import { IPage } from "./IPage";
import { IDiscussionBoardComment } from "./IDiscussionBoardComment";

export namespace IPageIDiscussionBoardComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardComment.ISummary[];
  };
}
