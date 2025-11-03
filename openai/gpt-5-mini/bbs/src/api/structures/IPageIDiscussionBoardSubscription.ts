import { IPage } from "./IPage";
import { IDiscussionBoardSubscription } from "./IDiscussionBoardSubscription";

export namespace IPageIDiscussionBoardSubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSubscription.ISummary[];
  };
}
