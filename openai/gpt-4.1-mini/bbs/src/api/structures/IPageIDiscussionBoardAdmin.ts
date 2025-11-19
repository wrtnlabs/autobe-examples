import { IPage } from "./IPage";
import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";

export namespace IPageIDiscussionBoardAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAdmin.ISummary[];
  };
}
