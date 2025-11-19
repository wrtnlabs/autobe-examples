import { IPage } from "./IPage";
import { IDiscussionBoardUserNotification } from "./IDiscussionBoardUserNotification";

export namespace IPageIDiscussionBoardUserNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardUserNotification.ISummary[];
  };
}
