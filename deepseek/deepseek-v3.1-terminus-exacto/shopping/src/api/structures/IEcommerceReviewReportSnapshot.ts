import { tags } from "typia";

import { IEcommerceAdministrator } from "./IEcommerceAdministrator";

export namespace IEcommerceReviewReportSnapshot {
  /**
   * Request parameters for searching and filtering review report snapshots with comprehensive criteria including creation time ranges, administrator actors, report categories, reasons, and specific customer or review references. Supports pagination and text search capabilities for efficient retrieval of audit trail records.
   */
  export type IRequest = {
    /**
     * Start date for filtering snapshots by creation timestamp range
     *
     * @x-autobe-specification Filter snapshots created after this timestamp. Maps to WHERE snapshot_created_at >= :startDate in database query.
     */
    snapshot_created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering snapshots by creation timestamp range
     *
     * @x-autobe-specification Filter snapshots created before this timestamp. Maps to WHERE snapshot_created_at <= :endDate in database query.
     */
    snapshot_created_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Administrator ID filter for snapshots created by specific actor
     *
     * @x-autobe-specification Filter snapshots created by specific administrator. Maps to WHERE actor_id = :actorId in database query.
     */
    actor_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Report category filter using pattern matching
     *
     * @x-autobe-specification Filter snapshots by report category pattern. Maps to WHERE report_category LIKE :categoryPattern in database query with trigram search.
     */
    report_category?: string | undefined;

    /**
     * Report reason filter using pattern matching
     *
     * @x-autobe-specification Filter snapshots by report reason pattern. Maps to WHERE report_reason LIKE :reasonPattern in database query with trigram search.
     */
    report_reason?: string | undefined;

    /**
     * Customer ID filter for snapshots related to specific customer
     *
     * @x-autobe-specification Filter snapshots by specific customer who submitted the original report. Maps to WHERE customer_id = :customerId in database query.
     */
    customer_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Review ID filter for snapshots related to specific review
     *
     * @x-autobe-specification Filter snapshots by specific review being reported. Maps to WHERE review_id = :reviewId in database query.
     */
    review_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Text search across report reason and category fields
     *
     * @x-autobe-specification Full-text search across report_reason and report_category fields using trigram indexes. Maps to WHERE (report_reason ILIKE :search OR report_category ILIKE :search) in database query.
     */
    search?: string | undefined;

    /**
     * Page number for paginated results (1-indexed)
     *
     * @x-autobe-specification Pagination page number for result set. Maps to OFFSET (:page - 1) * :limit in database query.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page
     *
     * @x-autobe-specification Maximum number of records per page. Maps to LIMIT :limit in database query.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary view of a review report snapshot showing essential information for audit trail listings. Contains the captured state of a review report at a specific point in time including report reason, category, creation timestamp, and associated administrator actor if applicable.
   */
  export type ISummary = {
    /**
     * Unique identifier of the snapshot record
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this snapshot was created
     *
     * @x-autobe-database-schema-property snapshot_created_at
     */
    snapshot_created_at: string & tags.Format<"date-time">;

    /**
     * The reason for the report at the time of snapshot creation
     *
     * @x-autobe-database-schema-property report_reason
     */
    report_reason: string;

    /**
     * The category of the report at the time of snapshot creation
     *
     * @x-autobe-database-schema-property report_category
     */
    report_category: string;

    /**
     * Administrator who created this snapshot, if applicable
     *
     * @x-autobe-database-schema-property actor
     */
    actor: IEcommerceAdministrator.ISummary | null;

    /**
     * Customer who submitted the original report
     *
     * @x-autobe-database-schema-property customer_id
     */
    customer_id: string & tags.Format<"uuid">;

    /**
     * Review being reported at snapshot time
     *
     * @x-autobe-database-schema-property review_id
     */
    review_id: string & tags.Format<"uuid">;
  };
}
