import { IPage } from "./IPage";
import { ICommunityPlatformTrendingTopic } from "./ICommunityPlatformTrendingTopic";

export namespace IPageICommunityPlatformTrendingTopic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformTrendingTopic.ISummary[];
  };
}
