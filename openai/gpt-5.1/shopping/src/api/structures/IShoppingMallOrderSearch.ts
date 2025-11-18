import { tags } from "typia";

export namespace IShoppingMallOrderSearch {
  /**
   * Request DTO for performing advanced administrative searches over orders
   * in the shoppingMall domain.
   *
   * This type encapsulates complex search criteria, pagination, and sorting
   * instructions that are applied primarily to the `shopping_mall_orders`
   * table and its subsidiary relations such as `shopping_mall_order_items`,
   * `shopping_mall_order_status_histories`, `shopping_mall_order_payments`,
   * and `shopping_mall_shipments`.
   *
   * It is designed for back-office and operational tooling where
   * administrators need to locate orders by code, customer identity, seller
   * identity, statuses, and time ranges while safely constraining result
   * sizes through pagination and ordering options.
   */
  export type IRequest = {
    /**
     * Optional list of business-facing order codes to match exactly.
     *
     * When provided, the search is restricted to orders whose `order_code`
     * is in this set. Values correspond to
     * `shopping_mall_orders.order_code` and should be human-friendly
     * identifiers such as formatted sequences.
     */
    order_codes?: string[] | undefined;

    /**
     * Optional list of customer identifiers whose orders should be
     * returned.
     *
     * Each value corresponds to
     * `shopping_mall_orders.shopping_mall_customer_id`. When provided, only
     * orders owned by these customers are considered. This field is
     * intended for administrative tools and must not be accepted from
     * end-customer self-service contexts.
     */
    customer_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of guest user identifiers whose orders should be
     * returned.
     *
     * Each value corresponds to
     * `shopping_mall_orders.shopping_mall_guestuser_id`. When provided,
     * only orders placed by these guest users are considered.
     */
    guestuser_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of seller identifiers used to find orders that contain
     * items owned by these sellers.
     *
     * Filtering by seller requires joins through subsidiary tables such as
     * `shopping_mall_order_items` and `shopping_mall_order_item_sellers`.
     * This filter is typically used for seller performance analysis or
     * dispute investigation.
     */
    seller_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of order-level current status values to match against
     * `shopping_mall_orders.current_status`.
     *
     * Examples include values such as "awaiting_payment",
     * "payment_confirmed", "preparing_shipment", "shipped", "delivered",
     * "cancelled", or "refunded" depending on configured business states.
     */
    current_statuses?: string[] | undefined;

    /**
     * Optional list of payment business status values used to filter orders
     * by the state of related payments.
     *
     * Values are applied to `shopping_mall_order_payments.business_status`
     * through joins and may include states such as "pending", "paid",
     * "partially_refunded", "refunded", "chargeback", or "cancelled".
     */
    payment_statuses?: string[] | undefined;

    /**
     * Optional list of shipment status values used to filter orders by the
     * state of their associated shipments.
     *
     * Values correspond to `shopping_mall_shipments.shipping_status` and
     * may include states such as "pending", "preparing",
     * "ready_for_pickup", "shipped", "in_transit", "out_for_delivery",
     * "delivered", "delivery_failed", "returned", or "cancelled".
     */
    shipment_statuses?: string[] | undefined;

    /**
     * Lower bound for the order creation time window, inclusive.
     *
     * When provided, only orders whose `shopping_mall_orders.created_at` is
     * greater than or equal to this timestamp are returned. Use ISO 8601
     * date-time format in UTC or with explicit timezone offset.
     */
    created_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound for the order creation time window, inclusive.
     *
     * When provided, only orders whose `shopping_mall_orders.created_at` is
     * less than or equal to this timestamp are returned. Use ISO 8601
     * date-time format in UTC or with explicit timezone offset.
     */
    created_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Lower bound for the business "placed_at" time window, inclusive.
     *
     * This filter is applied to `shopping_mall_orders.placed_at`, which
     * captures when the customer confirmed checkout. Use ISO 8601 date-time
     * format.
     */
    placed_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound for the business "placed_at" time window, inclusive.
     *
     * This filter is applied to `shopping_mall_orders.placed_at` and
     * restricts results to orders placed no later than this timestamp.
     */
    placed_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Lower bound for the last update time window, inclusive.
     *
     * When provided, only orders whose `shopping_mall_orders.updated_at` is
     * greater than or equal to this timestamp are returned. This is useful
     * for polling or incremental synchronization scenarios.
     */
    updated_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound for the last update time window, inclusive.
     *
     * When provided, only orders whose `shopping_mall_orders.updated_at` is
     * less than or equal to this timestamp are returned.
     */
    updated_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional minimum bound for the order grand total amount.
     *
     * When provided, only orders whose
     * `shopping_mall_orders.grand_total_amount` is greater than or equal to
     * this value are returned.
     */
    min_grand_total_amount?: number | null | undefined;

    /**
     * Optional maximum bound for the order grand total amount.
     *
     * When provided, only orders whose
     * `shopping_mall_orders.grand_total_amount` is less than or equal to
     * this value are returned.
     */
    max_grand_total_amount?: number | null | undefined;

    /**
     * Optional list of SKU identifiers used to find orders that contain
     * particular SKUs.
     *
     * Filtering by SKU requires joins to `shopping_mall_order_items` and
     * `shopping_mall_skus`. This is useful for product-specific
     * investigations and analytics.
     */
    item_sku_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional free-text search term applied to a configured subset of
     * textual order fields.
     *
     * Typical implementations apply this term to fields such as
     * `order_code`, customer-visible names, or product titles using
     * full-text search or ILIKE-based matching.
     */
    free_text?: string | undefined;

    /**
     * 1-based page index for pagination over the result set.
     *
     * When omitted, implementations commonly default to the first page.
     * This value is combined with `limit` to compute offset in the query.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of records to return in a single page.
     *
     * This value should respect an upper bound configured at the platform
     * level to prevent excessively large responses.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional logical sort key that selects which order field is used for
     * ordering the results.
     *
     * Common values include logical names such as "created_at",
     * "placed_at", "grand_total_amount", or "current_status". The exact set
     * of supported keys is defined by the implementation.
     */
    sort_key?: string | undefined;

    /**
     * Optional sort direction applied to the chosen `sort_key`.
     *
     * Typical values are "asc" for ascending order and "desc" for
     * descending order. When omitted, a sensible default such as descending
     * creation time should be used.
     */
    sort_direction?: string | undefined;
  };

  /**
   * Summary view of customer orders for search and list screens in the
   * shopping mall platform.
   *
   * Each instance represents the high-level state of a single order, derived
   * from the `shopping_mall_orders` primary table, and is optimized for order
   * history, admin search, and operational dashboards where detailed line
   * items are not required.
   *
   * This summary DTO purposely excludes nested order items, shipments, and
   * payment details to keep responses lightweight, while still exposing key
   * identifiers, monetary totals, lifecycle timestamps, and status
   * information for filtering and sorting.
   */
  export type ISummary = {
    /**
     * Unique identifier of the order record.
     *
     * This value is the primary key `shopping_mall_orders.id` and is used
     * as the canonical reference when loading full order detail or
     * performing order-specific operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Business-facing order code shown to customers and used in
     * communications, invoices, and support interactions.
     *
     * This maps to `shopping_mall_orders.order_code`, which is typically a
     * human-friendly formatted sequence and is unique across the platform
     * to allow easy sharing and search by both customers and staff.
     */
    order_code: string;

    /**
     * ISO 4217 currency code used for all monetary values in this order,
     * such as `USD` or `KRW`.
     *
     * This property is backed by `shopping_mall_orders.currency_code` and
     * is important for correctly displaying amounts and performing
     * currency-aware analytics.
     */
    currency_code: string;

    /**
     * Current high-level business status of the order.
     *
     * This value is read from `shopping_mall_orders.current_status` and can
     * represent states such as `awaiting_payment`, `payment_confirmed`,
     * `preparing_shipment`, `shipped`, `delivered`, `cancelled`, or
     * `refunded`. The precise lifecycle is further detailed in the
     * `shopping_mall_order_status_histories` table but is summarized here
     * for quick filtering and display.
     */
    current_status: string;

    /**
     * Total count of order line items at the time of order confirmation.
     *
     * This is a denormalized convenience value mapped from
     * `shopping_mall_orders.item_count` and is useful for quick overview
     * without loading the full `shopping_mall_order_items` collection.
     */
    item_count: number & tags.Type<"int32">;

    /**
     * Total amount charged to the customer for this order in the order
     * currency.
     *
     * This property corresponds to
     * `shopping_mall_orders.grand_total_amount` and already includes item
     * subtotals, discounts, shipping fees, surcharges, and taxes according
     * to the business rules applied at confirmation time.
     */
    grand_total_amount: number;

    /**
     * Timestamp when the customer confirmed checkout and the order record
     * was created.
     *
     * This value comes directly from `shopping_mall_orders.placed_at` and
     * is typically used to sort order history and time-based analytics.
     */
    placed_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this order row was first persisted in the database.
     *
     * This maps to `shopping_mall_orders.created_at` and may be identical
     * or very close to `placed_at`, depending on how the application
     * creates and finalizes order records.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this order row was last updated, including status
     * transitions and summary field changes.
     *
     * This corresponds to `shopping_mall_orders.updated_at` and is useful
     * for detecting recently modified orders in operational views.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp for this order, if it has been logically
     * removed from standard views.
     *
     * This property is based on `shopping_mall_orders.deleted_at`. It is
     * `null` for active orders and set to a concrete timestamp when an
     * order is soft-deleted for business, legal, or compliance reasons
     * while still being retained for audit purposes.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
