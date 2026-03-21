import { tags } from "typia";

import { IErpHrmEmployee } from "./IErpHrmEmployee";
import { IErpHrmProjectMember } from "./IErpHrmProjectMember";
import { IErpHrmTask } from "./IErpHrmTask";
import { IErpHrmTimelog } from "./IErpHrmTimelog";
import { IErpHrmTimesheet } from "./IErpHrmTimesheet";

export namespace IErpHrmTimesheetTimelog {
  /**
   * Request body for adding an existing timelog to a draft timesheet. Contains the timelog identifier to associate with the timesheet.
   */
  export type IAddRequest = {
    /**
     * Unique identifier of the timelog to add to this timesheet. The timelog must belong to the authenticated employee and fall within the timesheet's week date range.
     *
     * @x-autobe-database-schema-property erp_hrm_timelog_id
     * @x-autobe-specification Direct mapping from erp_hrm_timelog_id column in erp_hrm_timesheet_timelogs junction table. User provides the UUID of the timelog to associate with the timesheet. Validated server-side: timelog exists, belongs to same employee, date within timesheet week, not already in another submitted/approved timesheet.
     */
    erp_hrm_timelog_id: string & tags.Format<"uuid">;
  };

  /**
   * Request body for managing timelog associations on a draft timesheet. Contains arrays of timelog IDs to add to or remove from the timesheet.
   */
  export type IUpdate = {
    /**
     * Array of timelog UUIDs to add to the timesheet.
     *
     * @x-autobe-specification Array of timelog UUIDs (erp_hrm_timelog_id values) to associate with the timesheet. Server creates junction records by INSERTing into erp_hrm_timesheet_timelogs with these IDs and the path-parameter erp_hrm_timesheet_id. Validation: timelog must belong to the same employee as timesheet, timelog date must fall within timesheet week (Monday-Sunday), timelog not already associated.
     */
    addTimelogIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Array of timelog UUIDs to remove from the timesheet.
     *
     * @x-autobe-specification Array of timelog UUIDs (erp_hrm_timelog_id values) to disassociate from the timesheet. Server deletes junction records by DELETing from erp_hrm_timesheet_timelogs WHERE erp_hrm_timelog_id IN these IDs AND erp_hrm_timesheet_id = path param. Validation: timelog must currently be associated with this timesheet.
     */
    removeTimelogIds?: (string & tags.Format<"uuid">)[] | undefined;
  };

  /**
   * Inverted response for timesheet-timelog junction showing the complete timelog entry with its parent timesheet context. Used by GET endpoints to return timelog details without circular reference issues.
   */
  export type IInvert = {
    /**
     * Unique identifier of the timesheet-timelog junction record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from erp_hrm_timesheet_timelogs.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the timelog was added to the timesheet.
     *
     * @x-autobe-database-schema-property added_at
     * @x-autobe-specification Direct mapping from erp_hrm_timesheet_timelogs.added_at.
     */
    addedAt: string & tags.Format<"date-time">;

    /**
     * Complete timelog details including date, duration, description, billable flag, and resolved project/task associations.
     *
     * @x-autobe-database-schema-property timelog
     * @x-autobe-specification Join from erp_hrm_timesheet_timelogs.erp_hrm_timelog_id to erp_hrm_timelogs.id. Returns IErpHrmTimelog with all timelog fields and resolved employee/project/task summaries.
     */
    erpHrmTimelog: IErpHrmTimelog;

    /**
     * Employee who logged this time entry.
     *
     * @x-autobe-specification Traverse erp_hrm_timesheet_timelogs.timelog relation to erp_hrm_timelogs.erp_hrm_employee_id, then JOIN to erp_hrm_employees.id. Returns IErpHrmEmployee.ISummary.
     */
    erpHrmEmployee: IErpHrmEmployee.ISummary;

    /**
     * Project to which this time entry is associated.
     *
     * @x-autobe-specification Traverse erp_hrm_timesheet_timelogs.timelog relation to erp_hrm_timelogs.erp_hrm_project_id, then JOIN to erp_hrm_projects.id. Returns IErpHrmProject.ISummary.
     */
    erpHrmProject: IErpHrmProjectMember.ISummary;

    /**
     * Optional task within the project that this time entry is logged against.
     *
     * @x-autobe-specification Traverse erp_hrm_timesheet_timelogs.timelog relation to erp_hrm_timelogs.erp_hrm_task_id, then JOIN to erp_hrm_tasks.id. Returns IErpHrmTask.ISummary or null when task_id is null.
     */
    erpHrmTask?: IErpHrmTask.ISummary | null | undefined;

    /**
     * Parent timesheet context showing which weekly timesheet contains this timelog entry.
     *
     * @x-autobe-database-schema-property timesheet
     * @x-autobe-specification Join from erp_hrm_timesheet_timelogs.erp_hrm_timesheet_id to erp_hrm_timesheets.id. Returns IErpHrmTimesheet.ISummary only (partial view) to prevent circular reference in JSON serialization.
     */
    erpHrmTimesheet: IErpHrmTimesheet.ISummary;
  };
}
