import { IPage } from "./IPage";
import { IRedditPlatformModerationAction } from "./IRedditPlatformModerationAction";

export namespace IPageIRedditPlatformModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformModerationAction.ISummary[];
  };
}
