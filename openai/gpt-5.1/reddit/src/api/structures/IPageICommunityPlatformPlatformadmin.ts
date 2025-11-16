import { IPage } from "./IPage";
import { ICommunityPlatformPlatformadmin } from "./ICommunityPlatformPlatformadmin";

export namespace IPageICommunityPlatformPlatformadmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPlatformadmin.ISummary[];
  };
}
