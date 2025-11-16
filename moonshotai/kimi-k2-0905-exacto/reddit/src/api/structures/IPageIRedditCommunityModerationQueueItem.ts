import { IPage } from "./IPage";
import { IRedditCommunityModerationQueueItem } from "./IRedditCommunityModerationQueueItem";

export namespace IPageIRedditCommunityModerationQueueItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityModerationQueueItem.ISummary[];
  };
}
