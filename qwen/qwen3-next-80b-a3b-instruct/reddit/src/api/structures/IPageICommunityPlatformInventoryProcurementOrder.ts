import { IPage } from "./IPage";
import { ICommunityPlatformInventoryProcurementOrder } from "./ICommunityPlatformInventoryProcurementOrder";

export namespace IPageICommunityPlatformInventoryProcurementOrder {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformInventoryProcurementOrder.ISummary[];
  };
}
