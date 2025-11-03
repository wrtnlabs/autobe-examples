import { IPage } from "./IPage";
import { IDiscussionBoardModerationLog } from "./IDiscussionBoardModerationLog";

export namespace IPageIDiscussionBoardModerationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IContent = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerationLog.IContent[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IModerationLog = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerationLog.IModerationLog[];
  };
}
