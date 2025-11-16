import { IPage } from "./IPage";
import { ICommunityPlatformModerationAppeal } from "./ICommunityPlatformModerationAppeal";

export namespace IPageICommunityPlatformModerationAppeal {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationAppeal.ISummary[];
  };
}
