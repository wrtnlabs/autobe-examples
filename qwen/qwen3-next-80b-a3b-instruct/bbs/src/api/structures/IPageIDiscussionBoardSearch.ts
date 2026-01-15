import { IPage } from "./IPage";
import { IDiscussionBoardSearch } from "./IDiscussionBoardSearch";

export namespace IPageIDiscussionBoardSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSearch.ISummary[];
  };
}
