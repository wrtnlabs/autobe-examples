import { IPage } from "./IPage";
import { ICommunityPlatformProductCategory } from "./ICommunityPlatformProductCategory";

export namespace IPageICommunityPlatformProductCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformProductCategory.ISummary[];
  };
}
