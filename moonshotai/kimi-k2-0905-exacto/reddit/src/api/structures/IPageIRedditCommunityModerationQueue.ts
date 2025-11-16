import { IPage } from "./IPage";
import { IRedditCommunityModerationQueue } from "./IRedditCommunityModerationQueue";

export namespace IPageIRedditCommunityModerationQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityModerationQueue.ISummary[];
  };
}
