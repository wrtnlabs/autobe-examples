import { IPage } from "./IPage";
import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IPageIDiscussionBoardMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardMember.ISummary[];
  };
}
