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

export async function test_api_timesheet_rejection_preserves_included_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = "EmployeePass123!";
  const employeeHref = typia.random<string & tags.Format<"uri">>();
  const employeeReferrer = typia.random<string & tags.Format<"uri">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const joinedEmployee = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: employeeHref,
      referrer: employeeReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(joinedEmployee);
  const employeeLoginConnection: api.IConnection = { host: connection.host };
  const loggedInEmployee = await authorize_employee_login(
    employeeLoginConnection,
    {
      body: {
        email: employeeEmail,
        password: employeePassword,
        href: employeeHref,
        referrer: employeeReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingEmployee.ILogin,
    },
  );
  typia.assert(loggedInEmployee);
  const weekStart = new Date();
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  weekStart.setUTCHours(0, 0, 0, 0);
  const createdTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeLoginConnection,
      {
        body: {
          week_start_date: weekStart.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(createdTimesheet);
  TestValidator.equals(
    "timesheet belongs to logged in employee",
    createdTimesheet.employee.id,
    loggedInEmployee.id,
  );
  TestValidator.equals(
    "timesheet organization matches employee role organization",
    createdTimesheet.organization.id,
    loggedInEmployee.role.organization.id,
  );
  const expectedTotalHours =
    createdTimesheet.timelogs.reduce(
      (sum, timelog) => sum + timelog.duration_minutes,
      0,
    ) / 60;
  TestValidator.equals(
    "total hours equals included timelog durations",
    createdTimesheet.total_hours,
    expectedTotalHours,
  );
  const originalTimelogIds = createdTimesheet.timelogs.map(
    (timelog) => timelog.id,
  );
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "ManagerPass123!";
  const managerHref = typia.random<string & tags.Format<"uri">>();
  const managerReferrer = typia.random<string & tags.Format<"uri">>();
  const managerConnection: api.IConnection = { host: connection.host };
  const joinedManager = await authorize_manager_join(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href: managerHref,
      referrer: managerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(joinedManager);
  const managerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInManager = await authorize_manager_login(
    managerLoginConnection,
    {
      body: {
        email: managerEmail,
        password: managerPassword,
        href: managerHref,
        referrer: managerReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingManager.ILogin,
    },
  );
  typia.assert(loggedInManager);
  await TestValidator.error(
    "rejecting a non-submitted timesheet must fail",
    async () => {
      const rejected =
        await api.functional.hrmTimeTracking.manager.timesheets.reject(
          managerLoginConnection,
          {
            timesheetId: createdTimesheet.id,
            body: {
              rejection_reason: null,
            } satisfies IHrmTimeTrackingTimesheet.IReject,
          },
        );
      typia.assert(rejected);
    },
  );
  TestValidator.equals(
    "timelog membership snapshot remains unchanged in local timesheet object",
    createdTimesheet.timelogs.map((timelog) => timelog.id),
    originalTimelogIds,
  );
  TestValidator.equals(
    "local total hours snapshot remains unchanged after failed reject",
    createdTimesheet.total_hours,
    expectedTotalHours,
  );
}
