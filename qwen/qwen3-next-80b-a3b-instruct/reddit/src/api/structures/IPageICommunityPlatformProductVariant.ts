import { IPage } from "./IPage";
import { ICommunityPlatformProductVariant } from "./ICommunityPlatformProductVariant";

export namespace IPageICommunityPlatformProductVariant {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformProductVariant.ISummary[];
  };
}
