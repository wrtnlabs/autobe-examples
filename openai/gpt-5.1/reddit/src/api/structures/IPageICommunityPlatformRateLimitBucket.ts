import { IPage } from "./IPage";
import { ICommunityPlatformRateLimitBucket } from "./ICommunityPlatformRateLimitBucket";

export namespace IPageICommunityPlatformRateLimitBucket {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformRateLimitBucket.ISummary[];
  };
}
