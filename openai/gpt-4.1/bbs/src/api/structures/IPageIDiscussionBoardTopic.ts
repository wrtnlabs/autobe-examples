import { IPage } from "./IPage";
import { IDiscussionBoardTopic } from "./IDiscussionBoardTopic";

export namespace IPageIDiscussionBoardTopic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardTopic.ISummary[];
  };
}
