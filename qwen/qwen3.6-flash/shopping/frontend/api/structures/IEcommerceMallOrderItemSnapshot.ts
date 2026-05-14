import { tags } from "typia";

import { IEcommerceMallOrderItem } from "./IEcommerceMallOrderItem";

export namespace IEcommerceMallOrderItemSnapshot {
  /**
   * Search and filter parameters for retrieving historical order item snapshots.
   *
   * Allows filtering by specific event type and creation date ranges, standard pagination controls, and flexible sorting by multiple fields.
   */
  export type IRequest = {
    /**
     * Filter results by specific event type such as order_placed, paid, shipped, delivered, cancelled, or refunded.
     *
         * @x-autobe-database-schema-property event_type
         * @x-autobe-specification Exact match filter against
         *   `ecommerce_mall_order_item_snapshots.event_type`. Case-sensitive
         *   string comparison.
     */
    event_type?: string | undefined;

    /**
     * Filter snapshots created on or after this timestamp.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Maps to `created_at >= input`. Start boundary
         *   for `created_at` date range filter using timestamp comparison.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter snapshots created strictly before this timestamp.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Maps to `created_at < input`. Secondary
         *   exclusive boundary for `created_at` date range filter.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * The page number to retrieve, starting from 1.
     *
         * @x-autobe-specification 1-indexed page number. Database offset is
         *   calculated as `(page - 1) * limit`.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * The maximum number of items to return per page.
     *
         * @x-autobe-specification Rows per page. Bounded between 1 and 100.
         *   Direct database LIMIT clause value.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sorting criteria for the results. The array order defines the sort priority.
     *
         * @x-autobe-specification Array of literal sort directives. Each string
         *   uses format `{field}.{direction}` where field ∈ {`created_at`,
         *   `event_type`, `id`} and direction ∈ {`asc`, `desc`}. Array index
         *   order determines sort priority.
     */
    sort?:
      | (
          | "created_at.asc"
          | "created_at.desc"
          | "event_type.asc"
          | "event_type.desc"
          | "id.asc"
          | "id.desc"
        )[]
      | undefined;
  };

  /**
   * Immutable audit record capturing a point-in-time state transition for an order item within an e-commerce transaction.
   *
   * Each snapshot represents a pivotal moment in the fulfillment lifecycle—such as order placement, payment confirmation, shipment dispatch, delivery, or cancellation. It preserves the exact status evolution, provides optional before-and-after JSON payloads for dispute resolution, and links to the parent order item for contextual historical reference.
   */
  export type ISummary = {
    /**
     * Unique identifier for the snapshot record.
     *
     * This primary key globally identifies a specific state transition captured in the order fulfillment audit log.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.id (UUID format).
     */
    id: string & tags.Format<"uuid">;

    /**
     * The event type that triggered this snapshot.
     *
     * Indicates which fulfillment milestone caused this snapshot to be recorded. Accepted values include order_placed, paid, shipped, delivered, cancelled, and refunded.
     *
         * @x-autobe-database-schema-property event_type
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.event_type. Captures the exact
         *   milestone (e.g., order_placed, paid, shipped, delivered, cancelled,
         *   refunded).
     */
    event_type: string;

    /**
     * The status of the order item immediately before this transition occurred.
     *
     * Together with current_status, this establishes an exact audit trail by documenting the before and after state for every fulfillment event.
     *
         * @x-autobe-database-schema-property previous_status
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.previous_status. Records the
         *   fulfilled status before the event.
     */
    previous_status: string;

    /**
     * The resulting status of the order item immediately after the transition.
     *
     * Represents the resolved fulfillment state that dictates subsequent actions, such as shipment dispatch or return eligibility.
     *
         * @x-autobe-database-schema-property current_status
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.current_status. Records the
         *   resolved status after the event.
     */
    current_status: string;

    /**
     * JSON string containing the full state of the order item before the event.
     *
     * This payload captures variant details, pricing, and other fields exactly as they existed before the transition. Null when no prior payload was recorded for this event.
     *
         * @x-autobe-database-schema-property payload_before
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.payload_before. Nullable DB
         *   column — null when no prior payload was captured. Expressed as a
         *   JSON string for historical auditing and dispute resolution.
     */
    payload_before: string | null;

    /**
     * JSON string containing the full state of the order item after the event.
     *
     * Captures the new variant details, updated price, adjusted quantity, and finalized status following the transition. Null when no post-event payload was recorded.
     *
         * @x-autobe-database-schema-property payload_after
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.payload_after. Nullable DB
         *   column — null when no post payload was captured.
     */
    payload_after: string | null;

    /**
     * Optional structured data storing supplementary event-specific context.
     *
     * May include carrier handoff timestamps, dispute resolution notes, financial transaction IDs, or other contextual metadata about the transition. Null when no supplementary data was provided.
     *
         * @x-autobe-database-schema-property metadata
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.metadata. Nullable DB column —
         *   null when no supplementary data was included.
     */
    metadata: string | null;

    /**
     * Timestamp when this snapshot record was generated.
     *
     * Indicates the exact moment in time the state transition was recorded in UTC.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_order_item_snapshots.created_at (timestamptz
         *   format).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The order item record that this snapshot captures and tracks.
     *
     * Exposes the frozen order item details—such as purchased variant names, SKUs, prices, and quantities—via a database join.
     *
         * @x-autobe-database-schema-property orderItem
         * @x-autobe-specification Association relation: joined from
         *   ecommerce_mall_order_item_snapshots.orderItem via FK
         *   ecommerce_mall_order_item_id to ecommerce_mall_order_items.id.
         *   Returns frozen purchase data.
     */
    orderItem: IEcommerceMallOrderItem.ISummary;
  };
}
