import { IPage } from "./IPage";
import { ICommunityPlatformWarehouses } from "./ICommunityPlatformWarehouses";

export namespace IPageICommunityPlatformWarehouses {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformWarehouses.ISummary[];
  };
}
