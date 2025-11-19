import { IPage } from "./IPage";
import { IDiscussionBoardEmailVerification } from "./IDiscussionBoardEmailVerification";

export namespace IPageIDiscussionBoardEmailVerification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardEmailVerification.ISummary[];
  };
}
