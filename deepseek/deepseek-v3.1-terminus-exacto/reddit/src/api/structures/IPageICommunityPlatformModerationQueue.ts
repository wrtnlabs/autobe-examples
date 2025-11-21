import { IPage } from "./IPage";
import { ICommunityPlatformModerationQueue } from "./ICommunityPlatformModerationQueue";

export namespace IPageICommunityPlatformModerationQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationQueue.ISummary[];
  };
}
