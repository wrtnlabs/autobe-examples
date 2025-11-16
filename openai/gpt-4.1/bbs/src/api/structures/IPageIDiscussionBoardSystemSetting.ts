import { IPage } from "./IPage";
import { IDiscussionBoardSystemSetting } from "./IDiscussionBoardSystemSetting";

export namespace IPageIDiscussionBoardSystemSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSystemSetting.ISummary[];
  };
}
