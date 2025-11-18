import { tags } from "typia";

import { ITodoAppTaskId } from "./ITodoAppTaskId";
import { IError } from "./IError";

export namespace ITodoAppTaskDeletion {
  /**
   * Request data for bulk deletion of multiple tasks. Contains array of task
   * IDs that will be permanently removed from the authenticated user's task
   * list. Atomic bulk operation ensures all deletions succeed or fail
   * together, preventing partial completion scenarios that could leave task
   * lists in inconsistent states.
   */
  export type ICreate = {
    /**
     * Array of task IDs to be deleted. Must contain at least one task ID
     * for bulk deletion operation. Each task ID must be a valid UUID4
     * identifier associated with the authenticated user's own tasks to
     * prevent unauthorized access during bulk operations.
     */
    task_ids: ITodoAppTaskId[] & tags.MinItems<1> & tags.UniqueItems;
  };

  /**
   * Response summary for bulk task deletion operation providing detailed
   * results including success count, errors encountered, and total items
   * processed. Supports atomic processing where all operations succeed or
   * fail together, ensuring data consistency and preventing partial
   * completion states that could corrupt task management workflows.
   *
   * The summary structure emphasizes operational transparency by providing
   * complete visibility into processing outcomes. Users receive immediate
   * feedback about which tasks were successfully removed and which
   * encountered errors, enabling effective error handling and recovery
   * procedures. Error details include specific task identifiers and
   * human-readable messages for clear root cause analysis.
   *
   * This response format supports both bulk operations and auditing
   * requirements through comprehensive result tracking. The structure
   * accommodates various failure scenarios including permission errors,
   * concurrent modification conflicts, and task not found conditions while
   * maintaining clear summary statistics for user interface updates and
   * progress tracking.
   *
   * Error arrays preserve detailed context about each failed operation,
   * supporting both automated error handling systems and manual review
   * processes. The atomic design ensures users experience consistent behavior
   * where either all requested deletions succeed or the operation provides
   * complete visibility into any partial results, maintaining system
   * integrity and user trust in bulk processing operations.
   */
  export type ISummary = {
    /**
     * Number of tasks successfully deleted during the bulk operation. This
     * count reflects actual deletions performed and may be less than total
     * requested if some tasks failed due to validation errors, permission
     * issues, or concurrent modifications. Updated atomically to ensure
     * consistency with total processing results and error reporting.
     */
    deleted_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Array of error records for tasks that failed deletion, providing
     * detailed information about specific failures such as permission
     * issues, task not found, or concurrent modifications. Each error links
     * to specific task that encountered problems during processing. Errors
     * include both technical details and human-readable messages supporting
     * both automated error handling and user notification systems.
     */
    errors: IError.ISummary[];

    /**
     * Total number of tasks requested for deletion, representing the size
     * of the original request batch submitted through the
     * ITodoAppTaskBulkDelete.ICreate operation. Provides baseline for
     * calculating success rates and measuring operation efficiency while
     * supporting progress indicator calculations in user interfaces.
     */
    total_requested: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
