import { IConnection, PlainFetcher } from "@nestia/fetcher";
import typia from "typia";

import { IErpHrmTimeTrackingTimelog } from "../../../../../../structures/IErpHrmTimeTrackingTimelog";

/**
 * Stop the authenticated employee’s currently running live timer and finalize a timelog.
 *
 * This operation ends the employee’s active {@link erp_hrm_time_tracking_timer_sessions} record (where {@link erp_hrm_time_tracking_timer_sessions.is_active} is true) for the selected organization context and uses it to create a finalized {@link erp_hrm_time_tracking_timelogs} record.
 *
 * When the stop succeeds, the system calculates the total tracked duration from the timer session’s {@link erp_hrm_time_tracking_timer_sessions.started_at} to the stop action time, converts it to minutes, and rounds the resulting minutes to the nearest minute. The created timelog is attributed to the same organization and employee as the stopped timer session via {@link erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_organization_id} and {@link erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_employee_id}, and it references the same project and optional task via {@link erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_project_id} and {@link erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_task_id}.
 *
 * The timelog’s note/work description is sourced from the timer session’s {@link erp_hrm_time_tracking_timer_sessions.description}. The operation also assigns the timelog {@link erp_hrm_time_tracking_timelogs.work_date} based on the stop timing and sets the timelog time window fields (where applicable) using the timer session timestamps.
 *
 * Security and authorization:
 *
 * Only the authenticated member who owns the active {@link erp_hrm_time_tracking_timer_sessions} row in the selected organization context can stop it. The operation must reject stop attempts when there is no active timer session available for the employee within that organization.
 *
 * Expected behavior and error handling:
 *
 * - If the employee has no running timer session (i.e., no active {@link erp_hrm_time_tracking_timer_sessions} row for the employee in the organization), the operation must reject the stop request.
 * - If duration calculation fails due to an unexpected internal failure, the operation must reject and must not create a {@link erp_hrm_time_tracking_timelogs} record.
 * - After a successful stop, the stopped timer session must no longer be usable as the active session for subsequent starts; the employee can later start a new timer session.
 *
 * Related operations:
 *
 * This operation is the terminal step of the live tracking workflow. It complements operations that start a timer, update the timer session’s selected project/task/description while it is running, and discard the timer session without producing a finalized timelog.
 *
 * @param props.connection
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps for Realize Agent:
 *
 * 1) Resolve current active timer session:
 * - Using the authenticated member’s identity and the selected organization context, query {@link erp_hrm_time_tracking_timer_sessions} where:
 *   - erp_hrm_time_tracking_timer_sessions.erp_hrm_time_tracking_organization_id = selected organization id
 *   - erp_hrm_time_tracking_timer_sessions.erp_hrm_time_tracking_employee_id = authenticated member/employee id
 *   - erp_hrm_time_tracking_timer_sessions.is_active = true
 * - Enforce the single-active-session invariant; the schema has @@unique([employee_id, is_active]). If multiple rows are found, treat it as a data integrity error.
 * - If no row exists, reject with the stop-denied condition (no running timer).
 *
 * 2) Compute stop timestamps and duration:
 * - Let stopAt be the current time at the service layer.
 * - Use started_at from the timer session as the interval start.
 * - Compute duration_minutes from (stopAt - started_at) in minutes.
 * - Round duration_minutes to the nearest minute as required by the requirements.
 * - Prepare timelog fields:
 *   - erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_organization_id = timerSession.organization_id
 *   - erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_employee_id = timerSession.employee_id
 *   - erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_project_id = timerSession.project_id
 *   - erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_task_id = timerSession.task_id (nullable)
 *   - erp_hrm_time_tracking_timelogs.note = timerSession.description
 *   - erp_hrm_time_tracking_timelogs.start_time = timerSession.started_at
 *   - erp_hrm_time_tracking_timelogs.end_time = stopAt
 *   - erp_hrm_time_tracking_timelogs.work_date = stopAt (aligned to timesheet grouping; if service uses date truncation, use the schema’s DateTime type consistently)
 *   - deleted_at remains null on create.
 *
 * 3) Transaction and atomicity:
 * - Execute the following in a single database transaction:
 *   a) Insert the new {@link erp_hrm_time_tracking_timelogs} row.
 *   b) Update the {@link erp_hrm_time_tracking_timer_sessions} row to end active state:
 *      - Set ended_at = stopAt
 *      - Set is_active = false
 *      - Update updated_at
 *      - Keep deleted_at as null (this endpoint ends the active session, not the audit retention mechanism).
 * - If duration computation or insert/update fails (including any internal duration calculation exception), rollback and reject without creating a timelog.
 *
 * 4) Response:
 * - Return the created timelog mapped to the appropriate response DTO (detailed timelog view).
 *
 * Edge cases:
 * - TimerSession timestamps: validate that started_at is present; if ended_at computation would produce negative duration, reject.
 * - Concurrency: because active session is unique per employee, ensure the query+update operates safely under concurrent requests; use row locking (e.g., SELECT ... FOR UPDATE) or rely on the uniqueness constraint and transactional isolation.
 * - Org scoping: never allow stopping a timer session from a different organization than the selected context.
 * @path /erpHrmTimeTracking/member/timerSessions/current/stop
 * @accessor api.functional.erpHrmTimeTracking.member.timerSessions.current.stop.stopCurrentTimerSession
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function stopCurrentTimerSession(
  connection: IConnection,
): Promise<stopCurrentTimerSession.Response> {
  return true === connection.simulate
    ? stopCurrentTimerSession.simulate(connection)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...stopCurrentTimerSession.METADATA,
          path: stopCurrentTimerSession.path(),
          status: null,
        },
      );
}
export namespace stopCurrentTimerSession {
  export type Response = IErpHrmTimeTrackingTimelog;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/timerSessions/current/stop",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () =>
    "/erpHrmTimeTracking/member/timerSessions/current/stop";
  export const random = (): IErpHrmTimeTrackingTimelog =>
    typia.random<IErpHrmTimeTrackingTimelog>();
  export const simulate = (_connection: IConnection): Response => {
    return random();
  };
}
