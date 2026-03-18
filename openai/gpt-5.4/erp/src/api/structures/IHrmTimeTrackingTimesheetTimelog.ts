import { tags } from "typia";

export namespace IHrmTimeTrackingTimesheetTimelog {
  /**
   * Request payload for adding one existing timelog to a specific draft weekly timesheet. Clients send the timelog identifier, while the target timesheet is identified by the URL path.
   */
  export type ICreate = {
    /**
     * Identifier of the existing timelog to add to the target draft timesheet.
     *
     * @x-autobe-database-schema-property hrm_time_tracking_timelog_id
     * @x-autobe-specification Direct mapping to hrm_time_tracking_timesheet_timelogs.hrm_time_tracking_timelog_id. Accept the UUID of an existing hrm_time_tracking_timelogs row to be linked to the target timesheet inclusion record. The referenced timelog must exist, be active, belong to the same organization and employee as the target timesheet resolved from {timesheetId}, fall within that timesheet's week boundary, and not already be linked through another non-deleted inclusion row because the database enforces uniqueness on hrm_time_tracking_timelog_id.
     */
    hrm_time_tracking_timelog_id: string & tags.Format<"uuid">;
  };
}
