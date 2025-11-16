import { IPage } from "./IPage";
import { ICommunityPlatformKarmaByUserStatistics } from "./ICommunityPlatformKarmaByUserStatistics";

export namespace IPageICommunityPlatformKarmaByUserStatistics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformKarmaByUserStatistics.ISummary[];
  };
}
