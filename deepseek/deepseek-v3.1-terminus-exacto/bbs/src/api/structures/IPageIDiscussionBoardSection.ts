import { IPage } from "./IPage";
import { IDiscussionBoardSection } from "./IDiscussionBoardSection";

export namespace IPageIDiscussionBoardSection {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSection.ISummary[];
  };
}
