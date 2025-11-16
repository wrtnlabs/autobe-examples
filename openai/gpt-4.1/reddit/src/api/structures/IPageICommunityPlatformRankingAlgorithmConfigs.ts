import { IPage } from "./IPage";
import { ICommunityPlatformRankingAlgorithmConfigs } from "./ICommunityPlatformRankingAlgorithmConfigs";

export namespace IPageICommunityPlatformRankingAlgorithmConfigs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformRankingAlgorithmConfigs.ISummary[];
  };
}
