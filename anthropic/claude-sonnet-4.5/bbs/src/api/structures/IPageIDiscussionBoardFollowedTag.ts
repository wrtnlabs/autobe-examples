import { IPage } from "./IPage";
import { IDiscussionBoardFollowedTag } from "./IDiscussionBoardFollowedTag";

export namespace IPageIDiscussionBoardFollowedTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardFollowedTag.ISummary[];
  };
}
