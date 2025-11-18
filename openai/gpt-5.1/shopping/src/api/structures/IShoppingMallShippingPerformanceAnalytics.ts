import { tags } from "typia";

import { IShoppingMallShippingMethod } from "./IShoppingMallShippingMethod";

export namespace IShoppingMallShippingPerformanceAnalytics {
  /**
   * Analytics query parameters defining time range, grouping, filters, and
   * pagination for shipping performance statistics.
   *
   * This request DTO is used by administrative actors to query shipping and
   * delivery performance analytics backed by snapshot tables such as
   * shopping_mall_shipping_performance_stats and related marketplace
   * statistics tables. It controls the time window, grouping dimensions, and
   * additional filters for computing aggregated shipping metrics.
   */
  export type IRequest = {
    /**
     * Start of the time range (inclusive) for which shipping performance
     * statistics should be computed. Must be provided in ISO 8601 date-time
     * format and be earlier than or equal to `to`.
     */
    from: string & tags.Format<"date-time">;

    /**
     * End of the time range (inclusive) for which shipping performance
     * statistics should be computed. Must be provided in ISO 8601 date-time
     * format and be equal to or later than `from`.
     */
    to: string & tags.Format<"date-time">;

    /**
     * Time granularity for aggregations, such as "day", "week", or "month".
     * This determines how snapshot records are bucketed along the time
     * axis.
     */
    granularity: string;

    /**
     * List of grouping dimensions to apply when computing shipping
     * performance metrics. Typical values include "shippingMethod",
     * "country", "region", or "seller".
     */
    groupBy?: string[] | undefined;

    /**
     * Optional seller identifier used to restrict analytics to shipments
     * and orders associated with a specific seller. When null, analytics
     * are computed across all sellers.
     */
    sellerId?: string | null | undefined;

    /**
     * Optional ISO 3166-1 alpha-2 country code filter limiting analytics to
     * shipments destined for a specific country.
     */
    countryCode?: string | null | undefined;

    /**
     * Optional logical region code filter aligning with
     * shopping_mall_regions or related configuration tables.
     */
    regionCode?: string | null | undefined;

    /**
     * Optional shipping method code used to limit analytics to a specific
     * shipping option or carrier-defined method.
     */
    shippingMethodCode?: string | null | undefined;

    /**
     * 1-based page index for paginated analytics results. Used together
     * with `limit` to control which slice of the aggregated result set is
     * returned.
     */
    page: number & tags.Type<"int32">;

    /**
     * Maximum number of aggregated analytics rows to return in a single
     * page. Upper-bounded by system configuration to protect analytics
     * infrastructure.
     */
    limit: number & tags.Type<"int32">;
  };

  /**
   * Summary view of daily shipping and delivery performance analytics for the
   * shopping mall platform.
   *
   * Each instance represents an aggregated metrics row derived from the
   * underlying `shopping_mall_shipping_performance_stats` snapshot table for
   * a particular shipping method code and calendar date.
   *
   * This summary DTO is optimized for list and dashboard views where
   * operations and logistics teams monitor fulfillment speed, on-time
   * delivery rates, and failure patterns over time.
   */
  export type ISummary = {
    /**
     * Unique identifier of this shipping performance statistics snapshot
     * row.
     *
     * This value maps directly to
     * `shopping_mall_shipping_performance_stats.id` and is used as the
     * primary key when referencing or caching a particular analytics
     * record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Calendar date for which these shipping performance metrics are
     * calculated.
     *
     * This value comes from
     * `shopping_mall_shipping_performance_stats.stats_date`. Although
     * conceptually date-only, it is represented as a full ISO-8601
     * `date-time` string, and the time component SHOULD be normalized to
     * midnight UTC for consistency across the analytics pipeline.
     */
    stats_date: string & tags.Format<"date-time">;

    /**
     * Business code identifying the shipping method or carrier/service
     * combination used for aggregation.
     *
     * This value maps to
     * `shopping_mall_shipping_performance_stats.shipping_method_code`. It
     * can represent logical methods such as `standard`, `express`, or
     * carrier-specific codes and is used to group and filter analytics
     * across time.
     */
    shipping_method_code: string;

    /**
     * Summary information about the shipping method configuration
     * associated with this analytics row.
     *
     * This association is derived via
     * `shopping_mall_shipping_performance_stats.shopping_mall_shipping_method_id`
     * to the `shopping_mall_shipping_methods` model and exposed as
     * `IShoppingMallShippingMethod.ISummary` so that dashboards and
     * analytics clients can display human‑readable method metadata (such as
     * method name and carrier) without issuing additional lookup calls.
     */
    shipping_method?: IShoppingMallShippingMethod.ISummary | undefined;

    /**
     * Number of shipments created on this date using this shipping method.
     *
     * This value is taken from
     * `shopping_mall_shipping_performance_stats.shipment_created_count` and
     * represents the count of distinct shipment records that entered the
     * "created" state for the associated method and date.
     */
    shipment_created_count: number & tags.Type<"int32">;

    /**
     * Number of shipments that transitioned to a shipped state on this date
     * using this shipping method.
     *
     * This maps to
     * `shopping_mall_shipping_performance_stats.shipment_shipped_count` and
     * is useful for understanding fulfillment throughput and backlog
     * resolution on a daily basis.
     */
    shipment_shipped_count: number & tags.Type<"int32">;

    /**
     * Number of shipments that were marked as delivered on this date using
     * this shipping method.
     *
     * This value corresponds to
     * `shopping_mall_shipping_performance_stats.shipment_delivered_count`
     * and helps measure successful delivery volume per method and day.
     */
    shipment_delivered_count: number & tags.Type<"int32">;

    /**
     * Number of shipments that entered a delivery failed state on this date
     * using this shipping method.
     *
     * This exposes
     * `shopping_mall_shipping_performance_stats.shipment_delivery_failed_count`
     * and is used to monitor failed deliveries that may require customer
     * support or logistics intervention.
     */
    shipment_delivery_failed_count: number & tags.Type<"int32">;

    /**
     * Number of shipments that were marked as returned to sender on this
     * date using this shipping method.
     *
     * This is derived from
     * `shopping_mall_shipping_performance_stats.shipment_returned_count`
     * and allows tracking of return logistics and potential issues such as
     * incorrect addresses or refused deliveries.
     */
    shipment_returned_count: number & tags.Type<"int32">;

    /**
     * Median time in hours from order payment confirmation to shipment
     * handover (fulfillment cycle) for shipments associated with this
     * method on this date.
     *
     * This value maps to
     * `shopping_mall_shipping_performance_stats.median_fulfillment_time_hours`.
     * It is a double-precision number representing the median, not the
     * mean, to better capture typical operational performance without being
     * overly influenced by extreme outliers.
     */
    median_fulfillment_time_hours: number;

    /**
     * Median time in hours from shipment handover to delivery confirmation
     * (transit cycle) for shipments using this method delivered on this
     * date.
     *
     * This exposes
     * `shopping_mall_shipping_performance_stats.median_transit_time_hours`
     * and is used to evaluate carrier performance and route efficiency for
     * each shipping method.
     */
    median_transit_time_hours: number;

    /**
     * Proportion of shipments delivered on or before their expected
     * delivery time threshold for this method on this date.
     *
     * This comes from
     * `shopping_mall_shipping_performance_stats.on_time_delivery_rate` and
     * is represented as a floating-point value between 0 and 1, where 1
     * means 100% of deliveries were considered on time.
     */
    on_time_delivery_rate: number;

    /**
     * Timestamp when this shipping performance stats row was first created
     * by the analytics pipeline.
     *
     * This value maps directly to
     * `shopping_mall_shipping_performance_stats.created_at` and indicates
     * when the snapshot was initially computed and persisted.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this shipping performance stats row was last
     * recomputed or corrected by the analytics pipeline.
     *
     * This corresponds to
     * `shopping_mall_shipping_performance_stats.updated_at` and is updated
     * whenever the statistics for the same `(shipping_method_code,
     * stats_date)` combination are recalculated or adjusted.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
