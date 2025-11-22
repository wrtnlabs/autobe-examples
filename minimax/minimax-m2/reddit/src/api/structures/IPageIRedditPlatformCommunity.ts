import { IPage } from "./IPage";
import { IRedditPlatformCommunity } from "./IRedditPlatformCommunity";

export namespace IPageIRedditPlatformCommunity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformCommunity.ISummary[];
  };
}
