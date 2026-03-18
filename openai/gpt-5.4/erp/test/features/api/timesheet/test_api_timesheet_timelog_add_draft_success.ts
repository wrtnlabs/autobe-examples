import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_employee_timesheets_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_timelog_add_draft_success(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const workedOn = new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#33aa55",
        status: "active",
        budget_hours: 40,
        start_date: monday.toISOString(),
        end_date: new Date(
          monday.getTime() + 6 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    },
  );
  typia.assert(project);
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "draft timesheet status",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "draft timesheet submitted_at remains null",
    draftTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet reviewed_at remains null",
    draftTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet rejection_reason remains null",
    draftTimesheet.rejection_reason,
    null,
  );
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          workedOn: workedOn.toISOString(),
          durationMinutes: 150,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  const refreshed =
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
  typia.assert(refreshed);
  TestValidator.equals(
    "refreshed timesheet id",
    refreshed.id,
    draftTimesheet.id,
  );
  TestValidator.equals("timesheet remains draft", refreshed.status, "draft");
  TestValidator.equals(
    "timesheet employee matches authenticated employee",
    refreshed.employee.id,
    authorized.id,
  );
  TestValidator.predicate(
    "added timelog is included",
    ArrayUtil.has(refreshed.timelogs, (entry) => entry.id === timelog.id),
  );
  const expectedTotalHours =
    refreshed.timelogs.reduce((sum, entry) => sum + entry.duration_minutes, 0) /
    60;
  TestValidator.equals(
    "total hours recalculated from included timelogs",
    refreshed.total_hours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "submitted_at unchanged after composition update",
    refreshed.submitted_at,
    draftTimesheet.submitted_at,
  );
  TestValidator.equals(
    "reviewed_at unchanged after composition update",
    refreshed.reviewed_at,
    draftTimesheet.reviewed_at,
  );
  TestValidator.equals(
    "rejection_reason unchanged after composition update",
    refreshed.rejection_reason,
    draftTimesheet.rejection_reason,
  );
}
