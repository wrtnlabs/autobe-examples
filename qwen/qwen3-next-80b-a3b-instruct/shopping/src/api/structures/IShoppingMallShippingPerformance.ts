import { tags } from "typia";

export namespace IShoppingMallShippingPerformance {
  /**
   * Performance metrics segmented by geographic region, showing delivery
   * efficiency variations across different areas. This nested object provides
   * breakdown by region code to identify operational hotspots and areas
   * requiring improvement.
   *
   * Represents detailed delivery performance analytics for specific
   * geographic jurisdictions, enabling logistics optimization and regional
   * operational analysis. Each entry corresponds to a distinct administrative
   * region with standardized ISO 3166-2 codes, providing granular insight
   * into service quality variations across different markets.
   *
   * This schema is used as a referenced component in
   * IShoppingMallShippingPerformance.ISummary to maintain proper object
   * naming conventions and enable reuse in other contexts. The data is
   * aggregated from regional delivery tracking systems and represents
   * calculated metrics for all delivered shipments within each region during
   * the reporting period.
   */
  export type ISummary = {
    /**
     * Standard ISO 3166-2 region code representing administrative division.
     * For example: 'US-CA' for California, 'KR-11' for Seoul Metropolitan
     * Area. Used to segment delivery performance by geographic jurisdiction
     * and ensure compatibility with international geographic standards.
     */
    regionCode: string;

    /**
     * Average delivery time in hours for this specific region, calculated
     * from all delivered orders in that region. Values are precise to two
     * decimal places and represent the median processing time from order
     * confirmation to delivery completion. This metric enables comparison
     * of regional logistical efficiency across different markets.
     */
    deliveryTime: number;

    /**
     * On-time delivery rate percentage for this region, calculated as the
     * proportion of deliveries meeting scheduled time windows within this
     * geographic area. Values are rounded to two decimal places and
     * represent the reliability of delivery commitments in this specific
     * jurisdiction.
     */
    onTimeRate: number;

    /**
     * Delivery failure percentage for this region, tracking recurring
     * issues in specific geographic areas that may need targeted logistics
     * solutions. Calculated as (failed_deliveries /
     * total_delivery_attempts) * 100. This metric highlights areas with
     * persistent delivery problems that require operational adjustments.
     */
    failureRate: number;

    /**
     * Composite carrier performance score for this region, rated from 0-100
     * based on delivery speed, reliability, and cost efficiency of all
     * carriers operating in this region. Calculated as weighted average of
     * individual carrier performance metrics within the region. Used to
     * evaluate carrier partner effectiveness and inform regional logistics
     * strategy.
     */
    carrierPerformance: number;

    /**
     * Total number of shipment deliveries completed within this region
     * during the reporting period. Used as denominator for rate
     * calculations and provides volume context for performance metrics.
     */
    totalShipments: number & tags.Type<"int32">;

    /**
     * Average cost in USD per shipment for deliveries in this region,
     * including carrier fees, handling charges, and packaging materials.
     * Calculated by dividing total shipping expenses by number of delivered
     * items. Helps evaluate regional logistics efficiency and carrier
     * contract performance.
     */
    averageCostPerShipment: number;
  };
}
