import { IPage } from "./IPage";
import { IDiscussionBoardAttachment } from "./IDiscussionBoardAttachment";

export namespace IPageIDiscussionBoardAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAttachment.ISummary[];
  };
}
