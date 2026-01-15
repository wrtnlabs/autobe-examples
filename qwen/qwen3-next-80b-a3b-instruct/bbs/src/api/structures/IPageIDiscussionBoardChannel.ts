import { IPage } from "./IPage";
import { IDiscussionBoardChannel } from "./IDiscussionBoardChannel";

export namespace IPageIDiscussionBoardChannel {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardChannel.ISummary[];
  };
}
