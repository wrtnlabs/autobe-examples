import { IPage } from "./IPage";
import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace IPageICommunityPlatformCommunity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunity.ISummary[];
  };
}
