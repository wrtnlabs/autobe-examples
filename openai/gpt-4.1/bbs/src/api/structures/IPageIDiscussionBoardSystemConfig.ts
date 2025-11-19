import { IPage } from "./IPage";
import { IDiscussionBoardSystemConfig } from "./IDiscussionBoardSystemConfig";

export namespace IPageIDiscussionBoardSystemConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSystemConfig.ISummary[];
  };
}
