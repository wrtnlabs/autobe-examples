import { tags } from "typia";

export namespace IError {
  /**
   * Summary error information containing essential details for user
   * notification and system logging. Provides context about which specific
   * task encountered problems during the bulk operation process.
   */
  export type ISummary = {
    /**
     * Error code identifier used for consistent error categorization and
     * handling
     */
    code: string;

    /**
     * Human-readable error message describing what went wrong during the
     * operation
     */
    message: string;

    /**
     * ID of the specific task that failed during the bulk deletion
     * operation
     */
    task_id?: (string & tags.Format<"uuid">) | undefined;
  };
}
