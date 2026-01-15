import { IPage } from "./IPage";
import { IRedditPlatformAuthToken } from "./IRedditPlatformAuthToken";

export namespace IPageIRedditPlatformAuthToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformAuthToken.ISummary[];
  };
}
