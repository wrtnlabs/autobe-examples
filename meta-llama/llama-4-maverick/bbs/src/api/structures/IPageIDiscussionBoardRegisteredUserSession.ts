import { IPage } from "./IPage";
import { IDiscussionBoardRegisteredUserSession } from "./IDiscussionBoardRegisteredUserSession";

export namespace IPageIDiscussionBoardRegisteredUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardRegisteredUserSession.ISummary[];
  };
}
