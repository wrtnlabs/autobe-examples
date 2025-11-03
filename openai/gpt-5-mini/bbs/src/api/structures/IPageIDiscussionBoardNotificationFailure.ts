import { IPage } from "./IPage";
import { IDiscussionBoardNotificationFailure } from "./IDiscussionBoardNotificationFailure";

export namespace IPageIDiscussionBoardNotificationFailure {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardNotificationFailure.ISummary[];
  };
}
