import { IPage } from "./IPage";
import { IShoppingMallShipmentTrackingEvent } from "./IShoppingMallShipmentTrackingEvent";

export namespace IPageIShoppingMallShipmentTrackingEvent {
  /**
   * Paginated collection of shipment tracking event summaries for a single
   * shipment.
   *
   * This schema wraps the `IShoppingMallShipmentTrackingEvent.ISummary` DTO
   * in a generic page envelope, combining the `pagination` metadata (current
   * page, page size, total records, and page count) with a `data` array of
   * tracking event summaries. It is used as the response type for read-only
   * search operations that list tracking milestones associated with a
   * shipment.
   *
   * The primary usage is in the PATCH
   * `/shoppingMall/shipments/{shipmentId}/trackingEvents` endpoint, which
   * queries the `shopping_mall_shipment_tracking_events` table for the
   * specified `shipmentId` and returns a timeline of events such as
   * `shipped`, `in_transit`, `out_for_delivery`, `delivered`, and
   * `delivery_failed`. Client applications—such as customer order tracking
   * pages, seller consoles, and platform admin tools—iterate over the `data`
   * array to render tracking timelines, while relying on the `pagination`
   * object to implement paging controls for shipments with many events.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Encapsulates the current page index, page size, total record count,
     * and derived total page count for the shipment tracking event result
     * set.
     */
    pagination: IPage.IPagination;

    /**
     * List of shipment tracking event summaries for the requested page.
     *
     * Each element corresponds to a single tracking milestone for a
     * shipment, represented by
     * `IShoppingMallShipmentTrackingEvent.ISummary`, which in turn maps to
     * a row in the `shopping_mall_shipment_tracking_events` Prisma model.
     */
    data: IShoppingMallShipmentTrackingEvent.ISummary[];
  };
}
