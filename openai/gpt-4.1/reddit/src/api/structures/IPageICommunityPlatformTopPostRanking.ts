import { IPage } from "./IPage";
import { ICommunityPlatformTopPostRanking } from "./ICommunityPlatformTopPostRanking";

export namespace IPageICommunityPlatformTopPostRanking {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformTopPostRanking.ISummary[];
  };
}
