import { IPage } from "./IPage";
import { IDiscussionBoardDiscussionBoardReply } from "./IDiscussionBoardDiscussionBoardReply";

export namespace IPageIDiscussionBoardDiscussionBoardReply {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardDiscussionBoardReply.ISummary[];
  };
}
