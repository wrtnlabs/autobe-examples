import { IPage } from "./IPage";
import { ICommunityPlatformInventoryBatches } from "./ICommunityPlatformInventoryBatches";

export namespace IPageICommunityPlatformInventoryBatches {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformInventoryBatches.ISummary[];
  };
}
