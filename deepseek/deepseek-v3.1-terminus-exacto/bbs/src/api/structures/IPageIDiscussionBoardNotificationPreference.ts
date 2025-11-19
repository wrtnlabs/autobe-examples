import { IPage } from "./IPage";
import { IDiscussionBoardNotificationPreference } from "./IDiscussionBoardNotificationPreference";

export namespace IPageIDiscussionBoardNotificationPreference {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardNotificationPreference.ISummary[];
  };
}
