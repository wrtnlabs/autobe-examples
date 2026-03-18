import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
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
import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_approval_non_submitted_rejected(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeePassword = "Password1234!";
  const employeeJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: employeePassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: employeeJoinBody,
  });
  typia.assert(employeeAuth);
  const weekStart = new Date();
  const day = weekStart.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(weekStart.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const draftTimesheetCreateBody = {
    week_start_date: weekStart.toISOString(),
  } satisfies IHrmTimeTrackingTimesheet.ICreate;
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: draftTimesheetCreateBody,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "timesheet belongs to authenticated employee",
    draftTimesheet.employee.id,
    employeeAuth.id,
  );
  TestValidator.notEquals(
    "timesheet id differs from employee id",
    draftTimesheet.id,
    employeeAuth.id,
  );
  TestValidator.notEquals(
    "draft timesheet is not submitted",
    draftTimesheet.status,
    "submitted",
  );
  TestValidator.notEquals(
    "draft timesheet is not approved",
    draftTimesheet.status,
    "approved",
  );
  TestValidator.equals(
    "submitted_at remains null before review",
    draftTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at remains null before review",
    draftTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection reason remains null before review",
    draftTimesheet.rejection_reason,
    null,
  );
  for (const timelog of draftTimesheet.timelogs) {
    TestValidator.equals(
      "timelog employee matches timesheet employee",
      timelog.employee.id,
      draftTimesheet.employee.id,
    );
    TestValidator.equals(
      "timelog organization matches timesheet organization",
      timelog.organization.id,
      draftTimesheet.organization.id,
    );
  }
  const managerConnection: api.IConnection = { host: connection.host };
  const managerPassword = "Password1234!";
  const managerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: managerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const managerAuth = await authorize_manager_join(managerConnection, {
    body: managerJoinBody,
  });
  typia.assert(managerAuth);
  await TestValidator.error(
    "manager cannot approve a non-submitted timesheet",
    async () => {
      await api.functional.hrmTimeTracking.manager.timesheets.approve(
        managerConnection,
        {
          timesheetId: draftTimesheet.id,
        },
      );
    },
  );
}
