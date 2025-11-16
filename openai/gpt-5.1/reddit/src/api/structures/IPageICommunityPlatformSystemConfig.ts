import { IPage } from "./IPage";
import { ICommunityPlatformSystemConfig } from "./ICommunityPlatformSystemConfig";

export namespace IPageICommunityPlatformSystemConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSystemConfig.ISummary[];
  };
}
