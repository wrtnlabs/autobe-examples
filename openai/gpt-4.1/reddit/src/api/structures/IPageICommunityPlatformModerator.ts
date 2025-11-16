import { IPage } from "./IPage";
import { ICommunityPlatformModerator } from "./ICommunityPlatformModerator";

export namespace IPageICommunityPlatformModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerator.ISummary[];
  };
}
