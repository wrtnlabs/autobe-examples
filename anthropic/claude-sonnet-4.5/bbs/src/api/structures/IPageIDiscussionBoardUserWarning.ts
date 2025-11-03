import { IPage } from "./IPage";
import { IDiscussionBoardUserWarning } from "./IDiscussionBoardUserWarning";

export namespace IPageIDiscussionBoardUserWarning {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardUserWarning.ISummary[];
  };
}
