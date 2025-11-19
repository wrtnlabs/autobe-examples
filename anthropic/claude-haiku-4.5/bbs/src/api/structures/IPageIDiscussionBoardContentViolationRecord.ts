import { IPage } from "./IPage";
import { IDiscussionBoardContentViolationRecord } from "./IDiscussionBoardContentViolationRecord";

export namespace IPageIDiscussionBoardContentViolationRecord {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardContentViolationRecord.ISummary[];
  };
}
