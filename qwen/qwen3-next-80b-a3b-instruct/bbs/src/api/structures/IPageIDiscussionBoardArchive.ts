import { IPage } from "./IPage";
import { IDiscussionBoardArchive } from "./IDiscussionBoardArchive";

export namespace IPageIDiscussionBoardArchive {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArchive.ISummary[];
  };
}
