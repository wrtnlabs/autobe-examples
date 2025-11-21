import { IPage } from "./IPage";
import { ICommunityPlatformCategory } from "./ICommunityPlatformCategory";

export namespace IPageICommunityPlatformCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCategory.ISummary[];
  };
}
