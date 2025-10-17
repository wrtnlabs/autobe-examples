import { IPage } from "./IPage";
import { IDiscussionBoardDiscussionBoardAdmin } from "./IDiscussionBoardDiscussionBoardAdmin";

export namespace IPageIDiscussionBoardDiscussionBoardAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardDiscussionBoardAdmin.ISummary[];
  };
}
