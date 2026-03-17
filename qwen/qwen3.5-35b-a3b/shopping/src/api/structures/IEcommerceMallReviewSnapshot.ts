import { tags } from "typia";

import { IEcommerceMallCustomer } from "./IEcommerceMallCustomer";
import { IEcommerceMallReview } from "./IEcommerceMallReview";

export namespace IEcommerceMallReviewSnapshot {
  /**
   * Request parameters for filtering and paginating review audit snapshot records.
   *
   * Provides pagination controls (cursor-based or page-based), date range filtering, and snapshot type filtering to efficiently search through the immutable audit history of review changes. Used to retrieve snapshots of when reviews were created, modified, or had their helpfulness votes updated.
   */
  export type IRequest = {
    /**
     * Page number for cursor-based pagination (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number for cursor-based pagination. Alternative to cursor-based pagination when client prefers page numbers. Page numbering starts from 1 (first page). Defaults to 1 when not specified.
     */
    page?: string | undefined;

    /**
     * Number of items per page.
     *
     * @x-autobe-specification Number of items per page for paginated results. Valid range: 1-100. Default value: 20. When combined with snapshot_type filters and date range, limits the number of matching snapshots returned in the current page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Cursor token for fetching the next page of results.
     *
     * @x-autobe-specification Cursor-based pagination token from a previous response's pagination.cursor field. Used to fetch the next page of results. The server validates that the cursor corresponds to a valid snapshot ID for resuming pagination from that point.
     */
    cursor?: string | undefined;

    /**
     * Number of items per page (alias for limit).
     *
     * @x-autobe-specification Alias for the limit parameter. Provides an alternative naming convention for pagination. When both pageSize and limit are provided, limit takes precedence. Valid range: 1-100.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by snapshot change type.
     *
     * @x-autobe-specification Exact match filter on the changed_by_type column. Acceptable values: 'created' (snapshot when review was first created), 'modified' (snapshot when review content was edited), 'helpfulness_updated' (snapshot when helpfulness votes were updated). If omitted, returns all snapshot types.
     */
    snapshotType?: "created" | "modified" | "helpfulness_updated" | undefined;

    /**
     * Filter snapshots created at or after this timestamp.
     *
     * @x-autobe-specification Greater-than-or-equal filter on the created_at timestamp column. Includes snapshots created at exactly this timestamp. Format: ISO 8601 datetime string (e.g., '2024-01-15T10:30:00Z'). Used to narrow results to a specific time period.
     */
    createdAtGte?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter snapshots created at or before this timestamp.
     *
     * @x-autobe-specification Less-than-or-equal filter on the created_at timestamp column. Includes snapshots created at exactly this timestamp. Format: ISO 8601 datetime string. Used to set the upper bound of the date range filter when combined with createdAtGte.
     */
    createdAtLte?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sort order for the paginated results.
     *
     * @x-autobe-specification Sort order for the ordering clause. Values: 'asc' for ascending (oldest first), 'desc' for descending (newest first). When omitted, defaults to 'desc' (newest snapshots first). Applied to the created_at column.
     */
    ordering?: "asc" | "desc" | undefined;
  };

  /**
   * Lightweight summary representation of a review audit trail snapshot for list views. Contains the essential point-in-time state data including the change type, previous and new state data, and timestamp. References the associated review and customer without including their full detail to maintain efficient list performance.
   */
  export type ISummary = {
    /**
     * Unique identifier for the review snapshot.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_review_snapshots.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of change captured (e.g., 'created', 'modified', 'helpfulness_updated').
     *
     * @x-autobe-database-schema-property snapshot_type
     * @x-autobe-specification Direct mapping from ecommerce_mall_review_snapshots.snapshot_type. Valid values: 'created' (initial creation), 'modified' (content edit), 'helpfulness_updated' (vote update).
     */
    snapshot_type: string;

    /**
     * JSON string containing the previous state of the review before this change. Null for initial creation.
     *
     * @x-autobe-database-schema-property old_data
     * @x-autobe-specification Direct mapping from ecommerce_mall_review_snapshots.old_data. JSON string containing previous review state. Null for initial creation snapshots.
     */
    old_data: string | null;

    /**
     * JSON string containing the complete review state after this change.
     *
     * @x-autobe-database-schema-property new_data
     * @x-autobe-specification Direct mapping from ecommerce_mall_review_snapshots.new_data. JSON string containing complete review state after this change.
     */
    new_data: string;

    /**
     * Timestamp when this snapshot was created, representing the point-in-time state captured.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_review_snapshots.created_at. Timestamp when this snapshot was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The review that this snapshot tracks.
     *
     * @x-autobe-database-schema-property review
     * @x-autobe-specification Join via ecommerce_mall_review_snapshots.ecommerce_mall_review_id to ecommerce_mall_reviews.id. Returns IEcommerceMallReview.ISummary.
     */
    review: IEcommerceMallReview.ISummary;

    /**
     * The customer who wrote or modified this review.
     *
     * @x-autobe-database-schema-property customer
     * @x-autobe-specification Join via ecommerce_mall_review_snapshots.customer_id to ecommerce_mall_customers.id. Returns IEcommerceMallCustomer.ISummary.
     */
    customer: IEcommerceMallCustomer.ISummary;
  };
}
