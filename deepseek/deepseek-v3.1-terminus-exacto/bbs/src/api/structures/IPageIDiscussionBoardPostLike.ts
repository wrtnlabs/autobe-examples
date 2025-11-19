import { IPage } from "./IPage";
import { IDiscussionBoardPostLike } from "./IDiscussionBoardPostLike";

export namespace IPageIDiscussionBoardPostLike {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardPostLike.ISummary[];
  };
}
