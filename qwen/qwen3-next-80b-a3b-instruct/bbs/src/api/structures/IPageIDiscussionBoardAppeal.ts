import { IPage } from "./IPage";
import { IDiscussionBoardAppeal } from "./IDiscussionBoardAppeal";

export namespace IPageIDiscussionBoardAppeal {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAppeal.ISummary[];
  };
}
