import { IPage } from "./IPage";
import { IDiscussionBoardCitizenViolation } from "./IDiscussionBoardCitizenViolation";

export namespace IPageIDiscussionBoardCitizenViolation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardCitizenViolation.ISummary[];
  };
}
