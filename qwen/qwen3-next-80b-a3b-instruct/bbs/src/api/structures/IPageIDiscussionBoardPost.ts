import { IPage } from "./IPage";
import { IDiscussionBoardPost } from "./IDiscussionBoardPost";

export namespace IPageIDiscussionBoardPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardPost.ISummary[];
  };
}
