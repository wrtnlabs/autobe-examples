import { IPage } from "./IPage";
import { IDiscussionBoardConfig } from "./IDiscussionBoardConfig";

export namespace IPageIDiscussionBoardConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardConfig.ISummary[];
  };
}
