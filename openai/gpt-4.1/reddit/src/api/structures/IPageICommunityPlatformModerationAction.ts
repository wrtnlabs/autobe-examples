import { IPage } from "./IPage";
import { ICommunityPlatformModerationAction } from "./ICommunityPlatformModerationAction";

export namespace IPageICommunityPlatformModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationAction.ISummary[];
  };
}
