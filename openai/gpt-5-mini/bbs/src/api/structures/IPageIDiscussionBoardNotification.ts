import { IPage } from "./IPage";
import { IDiscussionBoardNotification } from "./IDiscussionBoardNotification";

export namespace IPageIDiscussionBoardNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardNotification.ISummary[];
  };
}
