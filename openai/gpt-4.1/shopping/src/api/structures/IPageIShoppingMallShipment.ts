import { IPage } from "./IPage";
import { IShoppingMallShipment } from "./IShoppingMallShipment";

export namespace IPageIShoppingMallShipment {
  /**
   * A page of shipment summary records, conforming to organization-wide
   * result paging patterns for lists in the shopping mall logistics system.
   *
   * This schema contains a paged collection of shipment summaries for results
   * from search, filter, or report endpoints operating over the
   * shopping_mall_shipments table. The pagination object reflects current
   * page, record counts, and page limits for operational views. The data
   * array provides the main shipment summary records as response items,
   * optimizing for dashboard, operational workflow and reporting UI
   * consumption.
   *
   * Business context: This pattern facilitates efficient large-scale result
   * retrieval for admins, warehouse staff, and sellers managing shipments.
   * Each page is returned for UI paging, batch processing, or downstream
   * analytics.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShipment.ISummary[];
  };
}
