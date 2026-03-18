import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_list_manager_all_organizational_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member (manager)
  const managerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = { Authorization: managerAuth.token.access };
  // 2. Create employee record for manager (need to use the member_id from auth response)
  // Note: For this test, we'll create the employee with a placeholder role_id
  // In real scenario, there would be a default role or role creation endpoint
  const managerEmployee =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          member_id: managerAuth.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(managerEmployee);
  // 3. Create timesheet for manager
  const managerTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      managerConnection,
      {},
    );
  typia.assert(managerTimesheet);
  // 4. Create and authenticate second member (regular employee)
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = { Authorization: employeeAuth.token.access };
  // 5. Create employee record for second member
  const regularEmployee =
    await generate_random_hrm_platform_member_employees_create(
      employeeConnection,
      {
        body: {
          member_id: employeeAuth.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(regularEmployee);
  // 6. Create timesheet for second employee
  const employeeTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      employeeConnection,
      {},
    );
  typia.assert(employeeTimesheet);
  // 7. Manager retrieves all organizational timesheets
  const timesheetList =
    await api.functional.hrmPlatform.member.timesheets.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimesheet.IRequest,
      },
    );
  typia.assert(timesheetList);
  // 8. Validate response includes timesheets from both employees
  TestValidator.predicate(
    "timesheet list should contain at least 2 timesheets",
    () => timesheetList.data.length >= 2,
  );
  // Verify both timesheets are in the list
  const managerTimesheetInList = timesheetList.data.find(
    (ts) => ts.id === managerTimesheet.id,
  );
  const employeeTimesheetInList = timesheetList.data.find(
    (ts) => ts.id === employeeTimesheet.id,
  );
  TestValidator.predicate(
    "manager's timesheet should be in the list",
    () => managerTimesheetInList !== undefined,
  );
  TestValidator.predicate(
    "employee's timesheet should be in the list (manager can see all)",
    () => employeeTimesheetInList !== undefined,
  );
  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    timesheetList.pagination.records,
    timesheetList.data.length,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    () => timesheetList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    () => timesheetList.pagination.limit === 20,
  );
  // Verify timesheet structure
  timesheetList.data.forEach((ts) => {
    TestValidator.predicate(
      "timesheet should have valid week_start_date",
      () => ts.week_start_date !== undefined,
    );
    TestValidator.predicate(
      "timesheet should have valid week_end_date",
      () => ts.week_end_date !== undefined,
    );
    TestValidator.predicate(
      "timesheet should have status",
      () => ts.status !== undefined,
    );
    TestValidator.predicate(
      "timesheet should have employee reference",
      () => ts.employee !== undefined,
    );
  });
}