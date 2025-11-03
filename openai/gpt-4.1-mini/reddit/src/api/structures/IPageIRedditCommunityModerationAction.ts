import { IPage } from "./IPage";
import { IRedditCommunityModerationAction } from "./IRedditCommunityModerationAction";

export namespace IPageIRedditCommunityModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityModerationAction.ISummary[];
  };
}
