import { IPage } from "./IPage";
import { IDiscussionBoardWatchedTopic } from "./IDiscussionBoardWatchedTopic";

export namespace IPageIDiscussionBoardWatchedTopic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardWatchedTopic.ISummary[];
  };
}
