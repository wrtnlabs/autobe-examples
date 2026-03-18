import { tags } from "typia";

import { IHrmTimeTrackingMember } from "./IHrmTimeTrackingMember";
import { IHrmTimeTrackingTask } from "./IHrmTimeTrackingTask";

export namespace IHrmTimeTrackingTaskHistory {
  /**
   * Request body for paginating the status history entries of a specific task within a project. The task and project are identified by the URL path, so this body only carries pagination controls for browsing the task’s audit trail.
   */
  export type IRequest = {
    /**
     * Page number to retrieve, starting from 1.
     *
     * @x-autobe-specification 1-indexed pagination input for the task history list endpoint. If omitted, the service defaults to page 1. This is a query-control field, not a database mapping.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of task history records to return per page.
     *
     * @x-autobe-specification Maximum number of task history records to return per page. If omitted, the service uses the default page size. This is a query-control field, not a database mapping.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Lightweight task status history entry for audit and task history list views. It shows which task changed, who changed it, the previous and new status values, and when the transition occurred.
   */
  export type ISummary = {
    /**
     * Unique identifier of the task status history entry.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_time_tracking_task_histories.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Task whose status was changed.
     *
     * @x-autobe-database-schema-property task
     * @x-autobe-specification Join hrm_time_tracking_task_histories.hrm_time_tracking_task_id to hrm_time_tracking_tasks.id and serialize the related task as a compact summary reference.
     */
    task: IHrmTimeTrackingTask.ISummary;

    /**
     * Member who performed the status change.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join hrm_time_tracking_task_histories.hrm_time_tracking_member_id to hrm_time_tracking_members.id and serialize the acting member as a compact summary reference.
     */
    member: IHrmTimeTrackingMember.ISummary;

    /**
     * Task status before the transition.
     *
     * @x-autobe-database-schema-property from_status
     * @x-autobe-specification Direct mapping from hrm_time_tracking_task_histories.from_status.
     */
    from_status: string;

    /**
     * Task status after the transition.
     *
     * @x-autobe-database-schema-property to_status
     * @x-autobe-specification Direct mapping from hrm_time_tracking_task_histories.to_status.
     */
    to_status: string;

    /**
     * Exact time when the status change occurred.
     *
     * @x-autobe-database-schema-property changed_at
     * @x-autobe-specification Direct mapping from hrm_time_tracking_task_histories.changed_at. Preserve this value for chronological ordering in list responses.
     */
    changed_at: string & tags.Format<"date-time">;
  };
}
