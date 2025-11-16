import { IPage } from "./IPage";
import { IShoppingMallOrderSellerSegment } from "./IShoppingMallOrderSellerSegment";

export namespace IPageIShoppingMallOrderSellerSegment {
  /**
   * Paginated collection of seller-specific order segment summaries for a
   * single master order.
   *
   * This page type wraps the results of querying the
   * `shopping_mall_order_seller_segments` table for a given `orderId`, as
   * exposed by the `/shoppingMall/orders/{orderId}/sellerSegments` search
   * endpoint. The `pagination` property contains standard paging metadata,
   * while the `data` array holds summary DTOs for each seller segment
   * included on the current page. Clients use this wrapper to drive list UIs,
   * next/previous navigation, and analytical dashboards around per-seller
   * partitions of a customer-facing order.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current search over seller-specific order
     * segments.
     *
     * This object is an `IPage.IPagination` snapshot that reports which
     * page of results has been returned, how many records are included per
     * page, the total number of matching seller segments, and the total
     * number of pages that can be navigated for the given filter set. It is
     * always present, even when the `data` array is empty, so that clients
     * can consistently drive paging UI for the
     * `/shoppingMall/orders/{orderId}/sellerSegments` endpoint.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller segment summary records belonging to the current page
     * of the search result.
     *
     * Each element is an `IShoppingMallOrderSellerSegment.ISummary`
     * projection of a row from the `shopping_mall_order_seller_segments`
     * Prisma model. These summaries expose identifiers, monetary snapshot
     * fields, status, and core relationships needed to render list views
     * for the `/shoppingMall/orders/{orderId}/sellerSegments` operation.
     *
     * The array may be empty when no segments match the provided filters
     * for the selected page, but will always be present so that clients can
     * safely iterate and render consistent list structures.
     */
    data: IShoppingMallOrderSellerSegment.ISummary[];
  };
}
