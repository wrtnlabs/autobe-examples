import { tags } from "typia";

export namespace IEcommerceMallCancellationRequestSnapshot {
  /**
   * Lightweight snapshot summary for cancellation request audit trail. Shows point-in-time state changes when sellers respond to cancellation requests. Includes actor type, status transitions (before/after), action type (approved/rejected), and timestamp. Used in paginated lists for dispute resolution and historical review.
   */
  export type ISummary = {
    /**
     * Unique identifier for this snapshot record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * The cancellation request this snapshot belongs to.
     *
     * @x-autobe-database-schema-property cancellation_request_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.cancellation_request_id (UUID FK to ecommerce_mall_cancellation_requests.id).
     */
    cancellationRequestId: string & tags.Format<"uuid">;

    /**
     * Type of actor who performed the action (e.g., 'seller').
     *
     * @x-autobe-database-schema-property actor_type
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.actor_type. Always 'seller' for cancellation request snapshots.
     */
    actorType: string;

    /**
     * Cancellation request status before the state change. Null if this is the initial record.
     *
     * @x-autobe-database-schema-property status_before
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.status_before. Nullable - contains status before the state change (e.g., 'pending', 'approved', 'rejected').
     */
    statusBefore: string | null;

    /**
     * Cancellation request status after the state change.
     *
     * @x-autobe-database-schema-property status_after
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.status_after. Contains status after the state change (e.g., 'pending', 'approved', 'rejected').
     */
    statusAfter: string | null;

    /**
     * Type of action performed on the cancellation request (e.g., 'approved', 'rejected').
     *
     * @x-autobe-database-schema-property action
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.action. Enum: 'approved' or 'rejected'.
     */
    action: string;

    /**
     * Timestamp when this snapshot was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.created_at (timestamptz). Timestamp when the snapshot was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this snapshot was last updated (same as createdAt for immutable snapshots).
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_cancellation_request_snapshots.updated_at (timestamptz). Same as created_at for immutable snapshots.
     */
    updatedAt: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for filtering and paginating cancellation request snapshot audit trail records. Customers can search through their cancellation request history to track status changes, view seller responses (approved/rejected), and understand decision timelines. Supports filtering by actor type, status transitions, actions, date ranges, and specific cancellation requests. Pagination enables efficient retrieval of historical audit data for dispute resolution.
   */
  export type IRequest = {
    /**
     * Type of actor who performed the action (e.g., 'seller' for seller responses, 'customer' for customer submissions).
     *
     * @x-autobe-specification Query parameter: filter ecommerce_mall_cancellation_request_snapshots.actor_type column using equality comparison. Allowed values: 'customer', 'seller'.
     */
    actor_type?: string | undefined;

    /**
     * Cancellation request status before the state change.
     *
     * @x-autobe-specification Query parameter: filter ecommerce_mall_cancellation_request_snapshots.status_before column using equality comparison. Allowed values: 'pending', 'approved', 'rejected'.
     */
    status_before?: string | undefined;

    /**
     * Cancellation request status after the state change.
     *
     * @x-autobe-specification Query parameter: filter ecommerce_mall_cancellation_request_snapshots.status_after column using equality comparison. Allowed values: 'pending', 'approved', 'rejected'.
     */
    status_after?: string | undefined;

    /**
     * Type of action performed (e.g., 'approved' or 'rejected').
     *
     * @x-autobe-specification Query parameter: filter ecommerce_mall_cancellation_request_snapshots.action column using equality comparison. Allowed values: 'approved', 'rejected'.
     */
    action?: string | undefined;

    /**
     * Filter snapshots created on or after this date-time (inclusive).
     *
     * @x-autobe-specification Query parameter: filter snapshots where ecommerce_mall_cancellation_request_snapshots.created_at >= this date-time. ISO 8601 format.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter snapshots created on or before this date-time (inclusive).
     *
     * @x-autobe-specification Query parameter: filter snapshots where ecommerce_mall_cancellation_request_snapshots.created_at <= this date-time. ISO 8601 format.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * UUID of the specific cancellation request to filter snapshots for.
     *
     * @x-autobe-specification Query parameter: filter ecommerce_mall_cancellation_request_snapshots.cancellation_request_id column using equality comparison. UUID format. FK reference to ecommerce_mall_cancellation_requests.id.
     */
    cancellation_request_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for pagination (1-indexed).
     *
     * @x-autobe-specification Query parameter: page number for pagination (1-indexed). Integer >= 1. Applied as offset/page parameter to query results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Query parameter: maximum records to return per page. Integer 1-100. Applied as LIMIT clause to query results.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
