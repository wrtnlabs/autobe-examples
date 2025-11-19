import { IPage } from "./IPage";
import { IDiscussionBoardUserSuspension } from "./IDiscussionBoardUserSuspension";

export namespace IPageIDiscussionBoardUserSuspension {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardUserSuspension.ISummary[];
  };
}
