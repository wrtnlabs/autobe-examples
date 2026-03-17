import { tags } from "typia";

export namespace ICommunityPlatformUserReportDismissal {
  /**
   * Result of management operations on dismissed reports, providing success status, operation details, count of affected records, and execution timestamp.
   */
  export type IManagementResult = {
    /**
     * Indicates whether the management operation completed successfully.
     *
     * @x-autobe-specification Computed from operation execution result: true if all requested operations succeeded without errors, false if any operation failed or partial failures occurred.
     */
    success: boolean;

    /**
     * Human-readable description of the operation result.
     *
     * @x-autobe-specification Generated message describing operation outcome: 'Successfully archived N dismissed reports' or 'Failed to update dismissal reasons: reason details' based on operation type and results.
     */
    message: string;

    /**
     * Number of dismissal records that were successfully processed by the operation.
     *
     * @x-autobe-specification Count of dismissal records successfully processed during the operation. Computed as SUM of affected records across all operations in the request.
     */
    processedCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Timestamp indicating when the management operation was executed on the server.
     *
     * @x-autobe-specification Server timestamp recorded when the management operation completed execution. Used for auditing and tracking operation timing.
     */
    operationTimestamp: string & tags.Format<"date-time">;
  };

  /**
   * Request body for managing dismissed reports operations. Supports bulk actions on multiple dismissal records including archiving and reason updates.
   */
  export type IManagementRequest = {
    /**
     * Type of operation to perform on dismissal records: 'archive' to mark as deleted, 'update_reason' to modify dismissal reason.
     *
     * @x-autobe-specification Operation type determines which action to perform on dismissal records: 'archive' sets deleted_at timestamp, 'update_reason' updates dismissal_reason field. Must be one of the defined const values.
     */
    operation: "archive" | "update_reason";

    /**
     * Array of dismissal record IDs to which the operation should be applied.
     *
     * @x-autobe-specification Array of dismissal record UUIDs to apply the operation to. References community_platform_user_report_dismissals.id. Must contain at least one valid dismissal ID. Server validates existence and authorization for each ID.
     * @x-autobe-database-schema-property id
     */
    dismissal_ids: (string & tags.Format<"uuid">)[] & tags.MinItems<1>;

    /**
     * New dismissal reason text to apply when operation is 'update_reason'. Ignored for 'archive' operation. Can be null for clearing existing reason.
     *
     * @x-autobe-specification Optional new dismissal reason text for 'update_reason' operation. Maps directly to community_platform_user_report_dismissals.dismissal_reason column. Required for 'update_reason' operation, ignored for 'archive'. Nullable field in database.
     * @x-autobe-database-schema-property dismissal_reason
     */
    dismissal_reason?: string | null | undefined;
  };
}
