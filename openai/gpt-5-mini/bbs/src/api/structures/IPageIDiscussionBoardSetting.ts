import { IPage } from "./IPage";
import { IDiscussionBoardSetting } from "./IDiscussionBoardSetting";

export namespace IPageIDiscussionBoardSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSetting.ISummary[];
  };
}
