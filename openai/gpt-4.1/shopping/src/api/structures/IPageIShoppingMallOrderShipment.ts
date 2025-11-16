import { IPage } from "./IPage";
import { IShoppingMallOrderShipment } from "./IShoppingMallOrderShipment";

export namespace IPageIShoppingMallOrderShipment {
  /**
   * Paginated summary shipment batch response for a specific shopping mall
   * order.
   *
   * This schema represents a collection of shipment and fulfillment batch
   * summaries belonging to a single shopping mall order context. Each entry
   * in the data array delivers a shipment summary—including tracking, status,
   * and carrier—enabling clients to present multi-package, split-shipment, or
   * multi-carrier scenarios in customer, seller, or admin-facing UIs.
   *
   * This object is typically used in API responses that deliver paginated and
   * filterable results when searching for the logistics history of an order.
   * It integrates pagination logic via the pagination field, and supports
   * efficient, chunked UI rendering for orders that may have multiple
   * discrete fulfillment events due to backorder, split sourcing, returns, or
   * advanced logistics. The schema supports large-scale e-commerce platforms
   * with complex order-to-shipment workflows, and ensures downstream
   * developers can reliably iterate pages for dynamic interfaces or audits.
   *
   * For detailed information about each individual shipment batch, the
   * .data[] field references IShoppingMallOrderShipment.ISummary, which maps
   * closely to shopping_mall_order_shipments in the underlying data model.
   * All pagination metadata uses IPage.IPagination.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderShipment.ISummary[];
  };
}
