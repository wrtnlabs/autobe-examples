import { tags } from "typia";

export namespace IShoppingMallInventoryAndFulfillmentSearch {
  /**
   * Search criteria, filters, pagination, and sorting options for querying
   * combined inventory and fulfillment data.
   *
   * This DTO encapsulates the parameters sent by platform administrators when
   * searching across inventory items, SKUs/products, fulfillments, shipments,
   * and related operational data. It is optimized for flexible back-office
   * search and does not map directly to a single Prisma model.
   */
  export type IRequest = {
    /**
     * Page number for paginated search results. Starts from 1 when
     * provided.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of records to return per page. The backend should
     * enforce an upper bound to protect system performance.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Exact SKU code used to filter results to a specific product SKU, when
     * known.
     */
    skuCode?: string | undefined;

    /**
     * Product-level code used to filter results to all SKUs belonging to a
     * specific product.
     */
    productCode?: string | undefined;

    /**
     * Filter for a single fulfillment status (for example: `pending`,
     * `ready_to_pack`, `packed`, `shipped`, `delivered`, `cancelled`).
     */
    fulfillmentStatus?: string | undefined;

    /**
     * Filter for a single shipment status (for example: `pending`,
     * `label_created`, `in_transit`, `out_for_delivery`, `delivered`,
     * `returned`).
     */
    shipmentStatus?: string | undefined;

    /**
     * Region or market code as defined in region configuration tables, used
     * to scope results geographically (for example: `KR`, `US`,
     * `EU-NORTH`).
     */
    regionCode?: string | undefined;

    /**
     * Identifier of a warehouse or fulfillment center used to scope
     * inventory and fulfillment records to a specific physical location.
     */
    warehouseCode?: string | undefined;

    /**
     * If true, restricts results to inventory and fulfillment records
     * associated with backordered demand.
     */
    backorderOnly?: boolean | undefined;

    /**
     * If true, restricts results to inventory and fulfillment records
     * associated with preorder demand.
     */
    preorderOnly?: boolean | undefined;

    /**
     * Start of the creation date range filter applied to underlying
     * entities such as inventory items, fulfillments, or shipments.
     */
    createdFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the creation date range filter applied to underlying entities
     * such as inventory items, fulfillments, or shipments.
     */
    createdTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Field name used for sorting search results (for example: `skuCode`,
     * `availableQuantity`, `reservedQuantity`,
     * `latestFulfillmentCreatedAt`).
     */
    sortField?: string | undefined;

    /**
     * Sort direction applied to the chosen sort field. Typical values are
     * `asc` for ascending and `desc` for descending order.
     */
    sortDirection?: string | undefined;
  };

  /**
   * Summary DTO for combined inventory and fulfillment search results in the
   * shopping mall platform.
   *
   * Represents a single summarized row returned from inventory and
   * fulfillment search operations, combining key inventory state,
   * reservation, and fulfillment/shipping information for a specific product
   * SKU in a specific context.
   *
   * Optimized for list and dashboard views where operators or admins quickly
   * scan stock health, reservation pressure, and fulfillment status without
   * needing full detail records.
   */
  export type ISummary = {
    /**
     * Unique identifier of the SKU whose inventory and fulfillment state is
     * being summarized.
     */
    sku_id: string & tags.Format<"uuid">;

    /**
     * Human-readable code of the SKU (for example a variant code or SKU
     * code) used in operator tools to identify the sellable variant.
     */
    sku_code: string;

    /** Unique identifier of the product that owns this SKU. */
    product_id: string & tags.Format<"uuid">;

    /**
     * Display name of the product that this SKU belongs to.
     *
     * Used for listing and search result displays so that operators can
     * quickly recognize the item without fetching full product detail.
     */
    product_name: string;

    /** Unique identifier of the seller that owns the inventory for this SKU. */
    seller_id: string & tags.Format<"uuid">;

    /**
     * Display name of the seller that owns this inventory and fulfills this
     * SKU.
     */
    seller_name: string;

    /**
     * Business region code representing the market or geographic area where
     * this inventory and fulfillment state applies.
     *
     * Examples include country codes, market region identifiers, or
     * logistics region codes used in shipping configuration.
     */
    region_code: string;

    /**
     * Total on-hand stock quantity for this SKU in the given region across
     * all warehouses and inventory locations.
     *
     * Represents the sum of all positive inventory quantities before
     * reservations are applied.
     */
    total_stock_quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total quantity currently reserved for active orders, pre-orders, or
     * checkouts in progress.
     *
     * Used to understand how much inventory is already committed and not
     * available for new orders.
     */
    reserved_quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Effective available inventory quantity for new orders after
     * subtracting reservations from total stock.
     *
     * This value is typically computed as `total_stock_quantity -
     * reserved_quantity` and reflects the quantity that can be safely
     * sold.
     */
    available_quantity: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Indicates whether backorders are allowed for this SKU according to
     * the applicable backorder settings.
     *
     * When true, orders may still be accepted even if available quantity is
     * zero or negative, subject to business rules.
     */
    backorder_allowed: boolean;

    /**
     * Indicates whether this SKU is currently in a preorder phase according
     * to preorder configuration.
     *
     * When true, customers may place orders that will be fulfilled starting
     * from the configured release date.
     */
    preorder_active: boolean;

    /**
     * Nullable field indicating the earliest expected inbound inventory
     * date for this SKU in the given region.
     *
     * When non-null, this is an ISO 8601 timestamp that allows operators to
     * estimate when additional stock is expected to arrive based on
     * purchase orders, transfers, or production schedules.
     *
     * When null, there is no confirmed inbound date available.
     */
    earliest_inbound_date?:
      | (string & tags.Format<"date-time">)
      | null
      | undefined;

    /**
     * Number of open fulfillment records for this SKU that are not yet
     * completed.
     *
     * This typically counts fulfillments in states such as picking,
     * packing, or ready-to-ship.
     */
    open_fulfillment_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of shipments that currently contain this SKU in an in-transit
     * state.
     *
     * Used by operations and support teams to understand how many units are
     * already on the way to customers.
     */
    in_transit_shipment_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Nullable field indicating the most recent time this SKU was
     * successfully fulfilled (for example, delivered or otherwise
     * completed) in the given region.
     *
     * When non-null, this is an ISO 8601 timestamp used for operational
     * monitoring and reporting.
     *
     * When null, the SKU has not yet been fulfilled or the information is
     * not available.
     */
    last_fulfilled_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Nullable field representing the timestamp of the latest inventory
     * movement that affected this SKU in the given region.
     *
     * This may reflect stock increases, decreases, adjustments, or
     * warehouse transfers and is expressed as an ISO 8601 timestamp when
     * present.
     *
     * When null, no inventory movement has been recorded yet or the
     * information is unavailable.
     */
    last_stock_movement_at?:
      | (string & tags.Format<"date-time">)
      | null
      | undefined;

    /**
     * High-level derived status that summarizes the current inventory and
     * fulfillment health for this SKU.
     *
     * Typical values might include application-specific statuses such as
     * "healthy", "low_stock", "out_of_stock", "backorder", or "preorder".
     *
     * The exact value set is determined by business rules and is not
     * enforced as an enum here to allow configuration.
     */
    status: string & tags.MinLength<1>;
  };
}
