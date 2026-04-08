import { IHrmPlatformTask } from "./IHrmPlatformTask";
import { IHrmPlatformTimelog } from "./IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "./IHrmPlatformTimer";
import { IHrmPlatformTimesheet } from "./IHrmPlatformTimesheet";

export namespace IHrmPlatformDashboard {
  /**
   * Personal dashboard overview for the currently authenticated employee, aggregating time tracking activity and assigned work items.
   *
   * This response type provides employees with a comprehensive snapshot of their work activity within the selected organization context. The dashboard combines computed time totals, real-time timer status, recent time entries, timesheet workflow state, and pending task assignments into a single unified view.
   *
   * All data is scoped to the authenticated employee's record and the currently selected organization. Computed fields (hoursToday, hoursThisWeek) aggregate from timelog entries. The activeTimer field reflects any currently running timer session. Recent timelogs provide quick access to the last five time entries. The pendingTimesheet field indicates whether a timesheet exists for the current week and its approval status. Assigned tasks list shows work items with open or in-progress status, ordered by urgency.
   */
  export type IPersonal = {
    /**
     * Total hours logged by the employee today.
     *
     * Calculated by summing the duration_minutes from all timelog entries where the date matches the current day. The sum is converted from minutes to hours by dividing by 60.
     *
     * This value updates in real-time as new timelogs are created or existing ones are modified. If the employee has not logged any time today, this field returns 0.
     *
     * @x-autobe-specification SUM(hrm_platform_timelogs.duration_minutes) WHERE hrm_platform_employee_id equals current employee AND DATE(date) equals current date (midnight UTC to midnight UTC). Result divided by 60 to convert minutes to hours. Returns 0 if no timelogs exist for today.
     */
    hoursToday: number;

    /**
     * Total hours logged by the employee in the current week (Monday to Sunday).
     *
     * Calculated by summing the duration_minutes from all timelog entries within the current week period. Week boundaries are determined using the organization's timezone setting, starting from Monday 00:00 through Sunday 23:59.
     *
     * This value provides employees with visibility into their weekly time accumulation, useful for tracking against expected working hours or timesheet submission requirements. Returns 0 if no timelogs exist for the current week.
     *
     * @x-autobe-specification SUM(hrm_platform_timelogs.duration_minutes) WHERE hrm_platform_employee_id equals current employee AND date falls within current week (Monday 00:00 to Sunday 23:59 in organization timezone). Result divided by 60 to convert minutes to hours. Week boundaries determined by organization timezone setting.
     */
    hoursThisWeek: number;

    /**
     * Currently running timer session if the employee has an active timer, or null if no timer is running.
     *
     * When present, this object contains the timer's identifier, start timestamp, associated project and optional task, work description, and calculated elapsed time in seconds. The status field indicates 'active' for running timers.
     *
     * Employees can have at most one active timer at a time. If no timer is currently running, this field returns null. The elapsed time is calculated dynamically from the started_at timestamp to the current moment.
     *
     * @x-autobe-specification SELECT from hrm_platform_timers WHERE hrm_platform_employee_id equals current employee AND stopped_at IS NULL. Returns IHrmPlatformTimer.ISummary with id, started_at, stopped_at, description, project, task, status ('active'), duration (null for active), and elapsedTime (seconds since started_at). Returns null if no active timer exists. Each employee can have at most one active timer.
     */
    activeTimer: IHrmPlatformTimer.ISummary | null;

    /**
     * The five most recent timelog entries created by the employee, ordered by creation timestamp descending.
     *
     * Each timelog entry includes the work date, duration in minutes, optional description, billable status, and references to the associated project and optional task. Employee information is included for context.
     *
     * This list provides quick access to recent time entries for review or reference. The array is ordered with the most recently created timelog first. If the employee has no timelog entries, an empty array is returned.
     *
     * @x-autobe-specification SELECT id, date, duration_minutes, description, billable, employee (ISummary), project (ISummary), task (ISummary, nullable) FROM hrm_platform_timelogs WHERE hrm_platform_employee_id equals current employee. ORDER BY created_at DESC. LIMIT 5. Returns array of IHrmPlatformTimelog.ISummary. Empty array if no timelogs exist.
     */
    recentTimelogs: IHrmPlatformTimelog.ISummary[];

    /**
     * The timesheet for the current week if one exists with draft or submitted status, or null if no timesheet has been created for this week.
     *
     * When present, this object contains the timesheet's week period (Monday to Sunday), current workflow status, total hours aggregated from included timelogs, and references to the employee and optional reviewer. Submission and review timestamps indicate workflow progress.
     *
     * This field helps employees track their timesheet submission status. A null value indicates no timesheet exists for the current week, meaning the employee may need to create one. Timesheets with approved or rejected status are not included in this field.
     *
     * @x-autobe-specification SELECT id, week_start_date, week_end_date, status, employee (ISummary), reviewer (ISummary, nullable), submitted_at, reviewed_at FROM hrm_platform_timesheets WHERE employee_id equals current employee AND week_start_date equals current week's Monday AND status IN ('draft', 'submitted'). Returns IHrmPlatformTimesheet.ISummary or null if no timesheet exists for current week. Total hours computed from included timelogs.
     */
    pendingTimesheet: IHrmPlatformTimesheet.ISummary | null;

    /**
     * Tasks currently assigned to the employee with status 'open' or 'in-progress', ordered by priority (urgent first) then due date ascending.
     *
     * Each task includes the title, current workflow status, priority level, optional due date, estimated hours, and references to the assigned employee and optional parent task. This provides employees with a focused view of their active work items.
     *
     * Tasks are sorted to surface the most urgent and time-sensitive items first. Urgent priority tasks appear before high, medium, and low priority tasks. Within the same priority level, tasks with earlier due dates appear first. Tasks without due dates appear after dated tasks at the same priority level.
     *
     * @x-autobe-specification SELECT id, title, status, priority, due_date, estimated_hours, assignedEmployee (ISummary, nullable), parentTask (ISummary, nullable), created_at FROM hrm_platform_tasks WHERE assigned_employee_id equals current employee AND status IN ('open', 'in-progress'). ORDER BY priority DESC (urgent first), then due_date ASC. Returns array of IHrmPlatformTask.ISummary. Empty array if no tasks match criteria.
     */
    assignedTasks: IHrmPlatformTask.ISummary[];
  };
}
