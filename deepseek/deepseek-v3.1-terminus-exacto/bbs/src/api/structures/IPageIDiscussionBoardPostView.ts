import { IPage } from "./IPage";
import { IDiscussionBoardPostView } from "./IDiscussionBoardPostView";

export namespace IPageIDiscussionBoardPostView {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardPostView.ISummary[];
  };
}
