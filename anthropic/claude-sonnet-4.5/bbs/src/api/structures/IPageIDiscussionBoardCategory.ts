import { IPage } from "./IPage";
import { IDiscussionBoardCategory } from "./IDiscussionBoardCategory";

export namespace IPageIDiscussionBoardCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardCategory.ISummary[];
  };
}
