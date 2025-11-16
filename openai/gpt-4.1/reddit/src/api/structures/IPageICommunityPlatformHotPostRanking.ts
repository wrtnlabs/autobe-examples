import { IPage } from "./IPage";
import { ICommunityPlatformHotPostRanking } from "./ICommunityPlatformHotPostRanking";

export namespace IPageICommunityPlatformHotPostRanking {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformHotPostRanking.ISummary[];
  };
}
