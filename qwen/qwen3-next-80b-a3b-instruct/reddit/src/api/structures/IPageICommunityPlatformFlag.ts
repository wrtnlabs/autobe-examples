import { IPage } from "./IPage";
import { ICommunityPlatformFlag } from "./ICommunityPlatformFlag";

export namespace IPageICommunityPlatformFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformFlag.ISummary[];
  };
}
