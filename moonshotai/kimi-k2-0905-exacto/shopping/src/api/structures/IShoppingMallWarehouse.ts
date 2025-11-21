import { tags } from "typia";

export namespace IShoppingMallWarehouse {
  /**
   * Lightweight summary representation of warehouse storage locations within
   * the shopping mall platform's fulfillment network.
   *
   * This optimized view is engineered for high-performance list views,
   * inventory dashboard displays, and rapid reference scenarios across the
   * marketplace operational interfaces. The summary provides essential
   * warehouse identification and basic operational context while maintaining
   * efficient data transfer and rendering performance.
   *
   * The warehouse system supports multi-location inventory management,
   * enabling sellers to distribute stock across geographical regions and
   * optimize fulfillment operations based on customer proximity and delivery
   * requirements. Warehouses serve as physical storage nodes in the
   * distributed fulfillment network, coordinating with order management
   * systems to ensure accurate inventory tracking and efficient order
   * processing.
   *
   * Warehouse locations integrate with product variant inventory levels,
   * order shipment tracking, and seller analytics to provide comprehensive
   * supply chain visibility. The summary representation excludes detailed
   * operational data while maintaining critical identification and capacity
   * information for quick reference and decision-making workflows.
   */
  export type ISummary = {
    /**
     * Unique identifier of the warehouse storage location using UUID v4
     * format.
     *
     * This identifier serves as the primary key for warehouse records and
     * is used throughout the platform for inventory tracking, order
     * fulfillment coordination, and seller analytics. The UUID ensures
     * global uniqueness across the distributed fulfillment network.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Human-readable name of the warehouse facility for display and
     * reference purposes.
     *
     * The warehouse name typically includes geographical or functional
     * identifiers to help sellers and administrators quickly identify
     * storage locations. Examples include regional designations like 'West
     * Coast Distribution Center' or functional descriptions like
     * 'Electronics Fulfillment Hub'.
     */
    name: string;

    /**
     * Unique business identifier code for the warehouse location with
     * global scope across the platform.
     *
     * The warehouse code serves as a short, memorable identifier used in
     * API operations, URL paths, and business workflows. Codes are
     * typically alphanumeric and follow consistent naming conventions for
     * easy recognition and system integration.
     */
    code: string;

    /**
     * Geographical location or city name where the warehouse is situated
     * for logistical and operational reference.
     *
     * The location field provides high-level geographical context for
     * warehouse operations, typically containing city and state/province
     * information. This helps sellers and administrators understand
     * regional distribution patterns and optimize fulfillment strategies
     * based on customer proximity.
     */
    location: string;

    /**
     * Current operational status of the warehouse facility determining
     * availability for inventory storage and order fulfillment operations.
     *
     * The status field controls warehouse participation in the fulfillment
     * network. Active warehouses can receive inventory and fulfill orders,
     * while inactive warehouses are excluded from operational workflows.
     * Status changes are managed through administrative interfaces with
     * proper audit trails.
     */
    status: "active" | "inactive";

    /**
     * Total storage capacity of the warehouse in standardized units or
     * volume measurements.
     *
     * Capacity measurements represent the maximum inventory storage
     * capability of the warehouse facility. Units are consistent across the
     * platform and may represent physical space (square footage), storage
     * positions (pallet locations), or volume-based measurements depending
     * on the product categories supported.
     */
    total_capacity?: (number & tags.Type<"int32">) | undefined;

    /**
     * Currently available storage capacity in the warehouse for new
     * inventory allocation.
     *
     * Available capacity represents the remaining storage space after
     * accounting for current inventory levels. This metric is dynamically
     * updated based on inventory movements and serves as a key input for
     * inventory allocation decisions, new seller onboarding, and capacity
     * planning workflows.
     */
    available_capacity?: (number & tags.Type<"int32">) | undefined;
  };
}
