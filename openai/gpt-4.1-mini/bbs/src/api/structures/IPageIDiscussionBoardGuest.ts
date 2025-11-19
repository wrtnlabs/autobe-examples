import { IPage } from "./IPage";
import { IDiscussionBoardGuest } from "./IDiscussionBoardGuest";

export namespace IPageIDiscussionBoardGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardGuest.ISummary[];
  };
}
