import { IPage } from "./IPage";
import { IDiscussionBoardCitizen } from "./IDiscussionBoardCitizen";

export namespace IPageIDiscussionBoardCitizen {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardCitizen.ISummary[];
  };
}
