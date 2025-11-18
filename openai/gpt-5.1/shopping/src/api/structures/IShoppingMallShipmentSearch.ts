import { tags } from "typia";

import { IShoppingMallOrder } from "./IShoppingMallOrder";
import { IShoppingMallSeller } from "./IShoppingMallSeller";
import { IShoppingMallShippingMethod } from "./IShoppingMallShippingMethod";

export namespace IShoppingMallShipmentSearch {
  /**
   * Request DTO for performing advanced searches over shipments in the
   * shoppingMall domain.
   *
   * This type encapsulates shipment-level search criteria, pagination, and
   * sorting instructions that are primarily applied to the
   * `shopping_mall_shipments` table and its subsidiary relations such as
   * `shopping_mall_shipment_items`, `shopping_mall_shipment_events`,
   * `shopping_mall_shipping_addresses`, and
   * `shopping_mall_shipping_methods`.
   *
   * It is designed for use by authenticated customers, sellers, and internal
   * tools to locate shipments based on codes, order references, carriers,
   * tracking numbers, statuses, and time ranges while keeping result sets
   * bounded with paging options.
   */
  export type IRequest = {
    /**
     * Optional list of shipment codes to match exactly.
     *
     * Each value corresponds to `shopping_mall_shipments.shipment_code` and
     * is used to restrict results to specific fulfillment units.
     */
    shipment_codes?: string[] | undefined;

    /**
     * Optional list of order codes used to find shipments belonging to
     * those orders.
     *
     * Values are matched against `shopping_mall_orders.order_code` via the
     * `shopping_mall_shipments.shopping_mall_order_id` relation.
     */
    order_codes?: string[] | undefined;

    /**
     * Optional list of order identifiers whose shipments should be
     * returned.
     *
     * Each identifier corresponds to
     * `shopping_mall_shipments.shopping_mall_order_id` referencing
     * `shopping_mall_orders.id`. This filter is typically used by internal
     * tools rather than customer-facing UIs.
     */
    order_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of seller identifiers whose shipments should be
     * returned.
     *
     * Each identifier corresponds to
     * `shopping_mall_shipments.shopping_mall_seller_id` referencing
     * `shopping_mall_sellers.id`. This filter is particularly useful for
     * seller dashboards and performance monitoring.
     */
    seller_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of shipping status values to match against
     * `shopping_mall_shipments.shipping_status`.
     *
     * Examples include internal status codes such as "pending",
     * "preparing", "ready_for_pickup", "shipped", "in_transit",
     * "out_for_delivery", "delivered", "delivery_failed", "returned", or
     * "cancelled".
     */
    shipping_statuses?: string[] | undefined;

    /**
     * Optional list of carrier names used to filter shipments by the
     * logistic provider.
     *
     * Values match `shopping_mall_shipments.carrier_name` and can be used
     * to identify shipments handled by a particular courier or carrier
     * group.
     */
    carrier_names?: string[] | undefined;

    /**
     * Optional list of tracking numbers used to locate specific shipments.
     *
     * Values correspond to `shopping_mall_shipments.tracking_number` and
     * are commonly used in customer-facing tracking flows and support
     * investigations.
     */
    tracking_numbers?: string[] | undefined;

    /**
     * Optional list of destination country codes used to filter shipments
     * by delivery country.
     *
     * Values correspond to `shopping_mall_shipping_addresses.country_code`
     * and must be ISO 3166-1 alpha-2 codes such as "US" or "KR".
     */
    destination_country_codes?: string[] | undefined;

    /**
     * Optional list of destination regions or states used to filter
     * shipments.
     *
     * Values correspond to `shopping_mall_shipping_addresses.region` and
     * may represent states, provinces, or other regional subdivisions
     * depending on the country.
     */
    destination_regions?: string[] | undefined;

    /**
     * Lower bound for the shipment creation time window, inclusive.
     *
     * This filter applies to `shopping_mall_shipments.created_at` and is
     * commonly used for time-based dashboards and monitoring.
     */
    created_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound for the shipment creation time window, inclusive.
     *
     * This filter applies to `shopping_mall_shipments.created_at` and
     * restricts results to shipments created no later than this timestamp.
     */
    created_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Lower bound for the time window in which shipments entered the
     * shipped state.
     *
     * This filter is applied to `shopping_mall_shipments.shipped_at` and is
     * useful for analyzing fulfillment performance.
     */
    shipped_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound for the time window in which shipments entered the
     * shipped state.
     *
     * This filter is applied to `shopping_mall_shipments.shipped_at` and
     * restricts results to shipments shipped no later than this timestamp.
     */
    shipped_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Lower bound for the delivery time window, inclusive.
     *
     * This filter is applied to `shopping_mall_shipments.delivered_at` and
     * is useful for delivery performance and SLA analysis.
     */
    delivered_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound for the delivery time window, inclusive.
     *
     * This filter is applied to `shopping_mall_shipments.delivered_at` and
     * restricts results to shipments delivered no later than this
     * timestamp.
     */
    delivered_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * 1-based page index for navigating through the shipment search result
     * set.
     *
     * When omitted, implementations should default to the first page. This
     * value is combined with `limit` to determine the underlying query
     * offset.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of shipment records to return in a single page.
     *
     * Back-end implementations should enforce a sensible upper bound to
     * avoid excessively large responses.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional logical sort key that selects which shipment attribute is
     * used for ordering the results.
     *
     * Common options include logical names such as "created_at",
     * "shipped_at", "delivered_at", or "shipping_status" as defined by the
     * implementation.
     */
    sort_key?: string | undefined;

    /**
     * Optional sort direction applied to the chosen `sort_key`.
     *
     * Typical values are "asc" for ascending order and "desc" for
     * descending order. A default such as descending creation time should
     * be used when omitted.
     */
    sort_direction?: string | undefined;
  };

  /**
   * Summary view of a shipment used in shipment search and list responses.
   *
   * This type provides a lightweight representation of shipment headers for
   * the shopping mall platform, optimized for search results, dashboards, and
   * listing screens where many shipments are shown at once.
   *
   * It focuses on identifiers, key status fields, main timeline markers, and
   * the most important BELONGS-TO associations (order, seller, and shipping
   * method) without including heavy relational graphs such as shipment items
   * or detailed event logs. More detailed inspection uses the full shipment
   * detail DTO associated with the same Prisma model.
   */
  export type ISummary = {
    /**
     * Unique identifier of the shipment.
     *
     * This corresponds to the primary key of the `shopping_mall_shipments`
     * table and is used internally and across services to reference this
     * shipment row.
     *
     * In list views it is usually not shown directly to end users but is
     * essential for navigation to shipment detail views and for backend
     * correlation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Business-facing shipment code used for seller and customer
     * communication.
     *
     * The value is derived at business level, often from the originating
     * order code with a suffix or using a dedicated shipment sequence. It
     * is human friendly and is the primary identifier visible in customer
     * and seller UIs.
     *
     * The underlying database column is unique, enabling efficient lookup
     * when users search by shipment code.
     */
    shipment_code: string;

    /**
     * Current shipping status of the shipment.
     *
     * Typical values include states such as `pending`, `preparing`,
     * `ready_for_pickup`, `shipped`, `in_transit`, `out_for_delivery`,
     * `delivered`, `delivery_failed`, `returned`, or `cancelled`.
     *
     * Search and list views primarily use this field to filter and cluster
     * shipments by lifecycle stage, and backoffice tools may provide
     * status-specific actions based on this value.
     */
    shipping_status: string;

    /**
     * Name of the carrier responsible for moving this shipment, or null
     * when not yet assigned.
     *
     * When present it typically contains the courier or logistics provider
     * name that both sellers and customers recognize, and can be used as a
     * filter in shipment search.
     *
     * If the shipment has not yet been tendered to a carrier or if the
     * platform does not track carrier information, this value remains
     * null.
     */
    carrier_name?: string | null | undefined;

    /**
     * Tracking number assigned by the carrier for this shipment, or null
     * when tracking is not yet available.
     *
     * Search screens may allow users to quickly confirm the tracking
     * identifier without drilling into full shipment detail, and operations
     * staff can filter based on tracking numbers when resolving incidents.
     *
     * When not supported by the carrier or before label creation, this
     * value is null.
     */
    tracking_number?: string | null | undefined;

    /**
     * Expected date and time when the shipment is planned to leave the
     * seller or warehouse, or null when there is no committed expectation.
     *
     * This information is useful for proactive communication, SLA
     * monitoring, and prioritization in operational dashboards.
     *
     * The value is recorded as an ISO 8601 date-time in the same timezone
     * convention as the rest of the platform.
     */
    expected_ship_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the shipment first entered the carrier network or was
     * marked as shipped.
     *
     * This helps measure lead times between order placement, fulfillment,
     * and actual dispatch, and is frequently used in performance and SLA
     * analyses.
     *
     * Null indicates that the shipment has not yet been shipped according
     * to business rules.
     */
    shipped_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the shipment was confirmed delivered to the customer,
     * if such confirmation exists.
     *
     * Shipment search lists often surface this time for completed shipments
     * to help support inquiries and customer self-service history views.
     *
     * When delivery has not occurred or has not been recorded yet, this
     * value is null.
     */
    delivered_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when this shipment record was created.
     *
     * In search and analytics contexts this is the canonical creation
     * moment used for default sorting, filtering by creation window, and
     * general operational reporting.
     *
     * The value directly reflects the `created_at` column of
     * `shopping_mall_shipments`.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this shipment record was last updated.
     *
     * This field allows list views and background processes to identify
     * recently changed shipments, for example when statuses change or
     * tracking information is refreshed.
     *
     * It mirrors the `updated_at` column of the `shopping_mall_shipments`
     * table.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Summary of the customer-facing order that this shipment fulfills.
     *
     * This BELONGS-TO association corresponds to the
     * `shopping_mall_order_id` foreign key on `shopping_mall_shipments` and
     * provides immediate context for which order the shipment belongs to.
     *
     * Including the order summary in search results allows operators and
     * customers to recognize the shipment by order code and basic order
     * information without issuing additional API calls.
     */
    order: IShoppingMallOrder.ISummary;

    /**
     * Summary of the seller responsible for fulfilling this shipment.
     *
     * This BELONGS-TO association corresponds to the
     * `shopping_mall_seller_id` foreign key on `shopping_mall_shipments`
     * and identifies the merchant or seller account that owns the shipped
     * items.
     *
     * The seller summary is especially important in multi‑seller
     * marketplaces, where shipment search screens and dashboards need to
     * group and filter shipments by seller context.
     */
    seller: IShoppingMallSeller.ISummary;

    /**
     * Summary of the shipping method configuration that was applied to this
     * shipment, or null when no explicit method snapshot is available.
     *
     * This BELONGS-TO association corresponds to the
     * `shopping_mall_shipping_method_id` foreign key on
     * `shopping_mall_shipments` and captures the core attributes of the
     * chosen shipping method, such as method code and display name.
     *
     * Providing the shipping method summary in the shipment search view
     * helps users and administrators quickly understand how the shipment is
     * being delivered without loading the full shipping method
     * configuration.
     */
    shipping_method?: IShoppingMallShippingMethod.ISummary | null | undefined;
  };
}
