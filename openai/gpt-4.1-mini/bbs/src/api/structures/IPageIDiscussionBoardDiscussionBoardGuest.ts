import { IPage } from "./IPage";
import { IDiscussionBoardDiscussionBoardGuest } from "./IDiscussionBoardDiscussionBoardGuest";

export namespace IPageIDiscussionBoardDiscussionBoardGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardDiscussionBoardGuest.ISummary[];
  };
}
