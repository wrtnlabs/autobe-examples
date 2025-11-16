import { IPage } from "./IPage";
import { ICommunityPlatformFeatureFlag } from "./ICommunityPlatformFeatureFlag";

export namespace IPageICommunityPlatformFeatureFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformFeatureFlag.ISummary[];
  };
}
