import { IPage } from "./IPage";
import { IDiscussionBoardDiscussionBoardMember } from "./IDiscussionBoardDiscussionBoardMember";

export namespace IPageIDiscussionBoardDiscussionBoardMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardDiscussionBoardMember.ISummary[];
  };
}
