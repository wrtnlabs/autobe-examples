import { IPage } from "./IPage";
import { IDiscussionBoardBan } from "./IDiscussionBoardBan";

export namespace IPageIDiscussionBoardBan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardBan.ISummary[];
  };
}
