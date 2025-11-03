import { IPage } from "./IPage";
import { IDiscussionBoardModerationAudit } from "./IDiscussionBoardModerationAudit";

export namespace IPageIDiscussionBoardModerationAudit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModerationAudit.ISummary[];
  };
}
