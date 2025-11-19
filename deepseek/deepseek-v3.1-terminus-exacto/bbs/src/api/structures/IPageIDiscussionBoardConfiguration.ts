import { IPage } from "./IPage";
import { IDiscussionBoardConfiguration } from "./IDiscussionBoardConfiguration";

export namespace IPageIDiscussionBoardConfiguration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardConfiguration.ISummary[];
  };
}
