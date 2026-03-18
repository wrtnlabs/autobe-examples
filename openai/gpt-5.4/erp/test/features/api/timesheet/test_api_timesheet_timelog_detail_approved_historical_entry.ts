import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_employee_timesheets_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_timelog_detail_approved_historical_entry(
  connection: api.IConnection,
): Promise<void> {
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = "Password123!" satisfies string &
    tags.Format<"password">;
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = "Password123!" satisfies string &
    tags.Format<"password">;
  const href = "https://example.com/hrm/timesheets" satisfies string &
    tags.Format<"uri">;
  const referrer = "https://example.com/hrm" satisfies string &
    tags.Format<"uri">;
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerJoined = await authorize_owner_join(ownerJoinConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerJoined);
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeJoined = await authorize_employee_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeJoined);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerLoggedIn = await authorize_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  typia.assert(ownerLoggedIn);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeLoggedIn = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeLoggedIn);
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStart = monday.toISOString() satisfies string &
    tags.Format<"date-time">;
  const workedOnDate = new Date(monday);
  workedOnDate.setUTCDate(monday.getUTCDate() + 2);
  workedOnDate.setUTCHours(9, 0, 0, 0);
  const workedOn = workedOnDate.toISOString() satisfies string &
    tags.Format<"date-time">;
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#33aa77",
        status: "active",
        budget_hours: 40,
        start_date: workedOn,
        end_date: null,
      },
    },
  );
  typia.assert(project);
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStart,
        },
      },
    );
  typia.assert(draftTimesheet);
  const timelogDescription = RandomGenerator.paragraph({ sentences: 4 });
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn,
          durationMinutes: 120,
          description: timelogDescription,
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  const timesheetWithTimelog =
    await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
      employeeConnection,
      {
        params: {
          timesheetId: draftTimesheet.id,
        },
        body: {
          hrm_time_tracking_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(timesheetWithTimelog);
  const approvedTimesheet =
    await api.functional.hrmTimeTracking.owner.timesheets.approve(
      ownerConnection,
      {
        timesheetId: draftTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  const approvedStatus = approvedTimesheet.status;
  const approvedReviewedAt = approvedTimesheet.reviewed_at;
  const approvedTotalHours = approvedTimesheet.total_hours;
  const historicalTimelog =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.at(
      employeeConnection,
      {
        timesheetId: approvedTimesheet.id,
        timelogId: timelog.id,
      },
    );
  typia.assert(historicalTimelog);
  const historicalTimelogAgain =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.at(
      employeeConnection,
      {
        timesheetId: approvedTimesheet.id,
        timelogId: timelog.id,
      },
    );
  typia.assert(historicalTimelogAgain);
  TestValidator.equals(
    "approved timesheet id persists",
    approvedTimesheet.id,
    draftTimesheet.id,
  );
  TestValidator.equals(
    "approved timesheet status",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "approved timesheet reviewed_at exists",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.equals(
    "approved total hours preserved",
    approvedTimesheet.total_hours,
    timesheetWithTimelog.total_hours,
  );
  TestValidator.predicate(
    "approved timesheet contains timelog",
    approvedTimesheet.timelogs.some((entry) => entry.id === timelog.id),
  );
  TestValidator.equals("timelog id matches", historicalTimelog.id, timelog.id);
  TestValidator.equals(
    "timelog employee matches",
    historicalTimelog.employee.id,
    timelog.employee.id,
  );
  TestValidator.equals(
    "timelog project matches",
    historicalTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "worked_on preserved",
    historicalTimelog.worked_on,
    timelog.worked_on,
  );
  TestValidator.equals(
    "duration preserved",
    historicalTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description preserved",
    historicalTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable preserved",
    historicalTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals("task remains null", historicalTimelog.task, null);
  TestValidator.equals(
    "deleted_at remains null",
    historicalTimelog.deleted_at,
    null,
  );
  TestValidator.equals(
    "repeat retrieval is read only",
    historicalTimelogAgain,
    historicalTimelog,
  );
  TestValidator.equals(
    "approved status unchanged after retrieval",
    approvedTimesheet.status,
    approvedStatus,
  );
  TestValidator.equals(
    "approved reviewed_at unchanged after retrieval",
    approvedTimesheet.reviewed_at,
    approvedReviewedAt,
  );
  TestValidator.equals(
    "approved total hours unchanged after retrieval",
    approvedTimesheet.total_hours,
    approvedTotalHours,
  );
}
