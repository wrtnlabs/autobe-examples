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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_detail_included_timelogs_total_hours(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const monday = new Date("2026-03-09T00:00:00.000Z");
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(created);
  const detail = await api.functional.hrmTimeTracking.employee.timesheets.at(
    employeeConnection,
    {
      timesheetId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("timesheet id remains the same", detail.id, created.id);
  TestValidator.equals(
    "organization remains the same",
    detail.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "employee remains the same",
    detail.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "week start remains the same",
    detail.week_start_date,
    created.week_start_date,
  );
  TestValidator.equals(
    "week end remains the same",
    detail.week_end_date,
    created.week_end_date,
  );
  TestValidator.equals(
    "status remains the same",
    detail.status,
    created.status,
  );
  TestValidator.equals(
    "submitted_at remains the same",
    detail.submitted_at,
    created.submitted_at,
  );
  TestValidator.equals(
    "reviewed_at remains the same",
    detail.reviewed_at,
    created.reviewed_at,
  );
  TestValidator.equals(
    "rejection_reason remains the same",
    detail.rejection_reason,
    created.rejection_reason,
  );
  TestValidator.equals(
    "timelog membership count remains the same",
    detail.timelogs.length,
    created.timelogs.length,
  );
  const createdTimelogIds = created.timelogs.map((timelog) => timelog.id);
  const detailTimelogIds = detail.timelogs.map((timelog) => timelog.id);
  TestValidator.equals(
    "timelog membership remains the same",
    detailTimelogIds,
    createdTimelogIds,
  );
  detail.timelogs.forEach((timelog, index) => {
    const source = created.timelogs[index];
    TestValidator.equals(
      `timelog ${index} organization matches`,
      timelog.organization.id,
      source.organization.id,
    );
    TestValidator.equals(
      `timelog ${index} employee matches`,
      timelog.employee.id,
      source.employee.id,
    );
    TestValidator.equals(
      `timelog ${index} project matches`,
      timelog.project.id,
      source.project.id,
    );
    TestValidator.equals(
      `timelog ${index} task matches`,
      timelog.task?.id ?? null,
      source.task?.id ?? null,
    );
    TestValidator.equals(
      `timelog ${index} worked_on matches`,
      timelog.worked_on,
      source.worked_on,
    );
    TestValidator.equals(
      `timelog ${index} duration_minutes matches`,
      timelog.duration_minutes,
      source.duration_minutes,
    );
    TestValidator.equals(
      `timelog ${index} description matches`,
      timelog.description,
      source.description,
    );
    TestValidator.equals(
      `timelog ${index} billable matches`,
      timelog.billable,
      source.billable,
    );
  });
  const totalMinutes = detail.timelogs.reduce(
    (sum, timelog) => sum + timelog.duration_minutes,
    0,
  );
  const expectedHours = totalMinutes / 60;
  TestValidator.equals(
    "total_hours equals included timelog duration sum in hours",
    detail.total_hours,
    expectedHours,
  );
  TestValidator.equals(
    "total_hours remains the same after read",
    detail.total_hours,
    created.total_hours,
  );
}
