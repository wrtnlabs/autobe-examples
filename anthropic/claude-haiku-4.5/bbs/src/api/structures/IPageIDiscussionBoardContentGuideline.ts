import { IPage } from "./IPage";
import { IDiscussionBoardContentGuideline } from "./IDiscussionBoardContentGuideline";

export namespace IPageIDiscussionBoardContentGuideline {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardContentGuideline.ISummary[];
  };
}
