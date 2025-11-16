import { IPage } from "./IPage";
import { ICommunityPlatformKarmaByContentStatistics } from "./ICommunityPlatformKarmaByContentStatistics";

export namespace IPageICommunityPlatformKarmaByContentStatistics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaByContentStatistics.ISummary[];
  };
}
