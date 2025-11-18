import { tags } from "typia";

export namespace ITodoAppTaskCompletion {
  /**
   * Request payload for bulk completion of multiple todo tasks. Enables
   * authenticated users to mark multiple tasks as completed in a single
   * atomic operation, providing efficient workflow for bulk task management.
   *
   * This operation supports productivity patterns including end-of-day task
   * reviews, project completion workflows, and organizational task management
   * where multiple items can be addressed simultaneously. The operation
   * maintains audit trails by creating completion records while updating task
   * status in bulk.
   *
   * Supports both selective completion (specific tasks) and filtered
   * completion based on user criteria. Atomic processing ensures all valid
   * tasks are completed successfully or none are modified, maintaining data
   * consistency.
   */
  export type ICreate = {
    /**
     * Array of task UUIDs to be marked as completed. All tasks must belong
     * to the authenticated user and exist in the todo_app_tasks table.
     * Tasks must be in pending or in-progress status for successful
     * completion.
     */
    task_ids: (string & tags.Format<"uuid">)[] &
      tags.MinItems<1> &
      tags.MaxItems<100> &
      tags.UniqueItems;
  };

  /**
   * Response summary containing statistics and confirmation of the bulk task
   * completion operation results.
   *
   * Provides comprehensive feedback about the bulk completion attempt
   * including success counts, failure details, and completion statistics.
   * This enables users to understand the outcome of their bulk operation and
   * identify any tasks that couldn't be completed.
   *
   * Contains advisory messages and summary statistics to help users interpret
   * bulk operation results and plan follow-up actions effectively.
   */
  export type ISummary = {
    /**
     * Total number of task IDs provided in the bulk completion request.
     * Represents the user's intended scope of the bulk operation.
     */
    total_requested: number & tags.Type<"int32">;

    /**
     * Number of tasks that were successfully marked as completed. Equal to
     * the number of todo_app_task_completions records created during this
     * operation.
     */
    successfully_completed: number & tags.Type<"int32">;

    /**
     * Number of tasks that could not be completed due to validation errors,
     * invalid status, or system constraints. These tasks remain in their
     * original state.
     */
    failed_count: number & tags.Type<"int32">;

    /**
     * Number of tasks that were already in completed status and thus
     * skipped. Prevents duplicate completion records for already-completed
     * tasks.
     */
    skipped_count: number & tags.Type<"int32">;

    /**
     * Overall success rate of the bulk operation expressed as percentage.
     * Calculated as (successfully_completed / total_requested) * 100 for
     * user-friendly feedback.
     */
    completion_percentage: number;

    /**
     * Array of UUIDs for tasks that were successfully completed. Users can
     * reference these IDs to verify which specific tasks were processed
     * successfully in their bulk operation.
     */
    completed_task_ids: (string & tags.Format<"uuid">)[] & tags.UniqueItems;

    /**
     * Array of UUIDs for tasks that failed to complete. Users can
     * investigate these specific tasks to understand completion failures
     * and take corrective action.
     */
    failed_task_ids: (string & tags.Format<"uuid">)[] & tags.UniqueItems;

    /**
     * Human-readable summary message about the bulk operation results.
     * Provides helpful context and next-step guidance based on the
     * completion statistics.
     */
    message: string;

    /**
     * Time taken to process the bulk operation in milliseconds. Helps users
     * understand performance characteristics and sets expectations for
     * large-scale bulk operations.
     */
    processing_time_ms: number & tags.Type<"int32">;

    /**
     * ISO 8601 timestamp indicating when the bulk operation was completed.
     * Useful for tracking operation history and correlating with user
     * action timelines.
     */
    timestamp: string & tags.Format<"date-time">;
  };
}
