import { IPage } from "./IPage";
import { IDiscussionBoardReply } from "./IDiscussionBoardReply";

export namespace IPageIDiscussionBoardReply {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardReply.ISummary[];
  };
}
