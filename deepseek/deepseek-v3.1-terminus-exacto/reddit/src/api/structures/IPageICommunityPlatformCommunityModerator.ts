import { IPage } from "./IPage";
import { ICommunityPlatformCommunityModerator } from "./ICommunityPlatformCommunityModerator";

export namespace IPageICommunityPlatformCommunityModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityModerator.ISummary[];
  };
}
