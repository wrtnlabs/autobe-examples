import { IPage } from "./IPage";
import { ICommunityPlatformAccountRestriction } from "./ICommunityPlatformAccountRestriction";

export namespace IPageICommunityPlatformAccountRestriction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAccountRestriction.ISummary[];
  };
}
