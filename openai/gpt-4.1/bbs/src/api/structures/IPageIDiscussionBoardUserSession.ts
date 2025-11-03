import { IPage } from "./IPage";
import { IDiscussionBoardUserSession } from "./IDiscussionBoardUserSession";

export namespace IPageIDiscussionBoardUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardUserSession.ISummary[];
  };
}
