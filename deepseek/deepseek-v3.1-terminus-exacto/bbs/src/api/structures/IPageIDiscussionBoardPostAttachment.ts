import { IPage } from "./IPage";
import { IDiscussionBoardPostAttachment } from "./IDiscussionBoardPostAttachment";

export namespace IPageIDiscussionBoardPostAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardPostAttachment.ISummary[];
  };
}
