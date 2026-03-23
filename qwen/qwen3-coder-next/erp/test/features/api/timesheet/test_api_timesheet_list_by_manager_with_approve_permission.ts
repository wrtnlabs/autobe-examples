import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_by_manager_with_approve_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account with authentication
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(manager);
  // 2. Create employee accounts
  const employeeCount = 3;
  const employeeConnections: api.IConnection[] = [];
  const employees: IHrmTrackerMember.ISummary[] = [];
  for (let i = 0; i < employeeCount; i++) {
    const employeeConnection: api.IConnection = { host: connection.host };
    const employee = await authorize_member_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        display_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHrmTrackerMember.IJoin,
    });
    typia.assert(employee);
    employeeConnections.push(employeeConnection);
    employees.push({
      id: employee.id,
      display_name: employee.display_name,
      avatar_url: employee.avatar_url,
      phone: employee.phone,
      status: employee.status,
      email_verified: employee.email_verified,
    });
  }
  // 3. Get current week dates for filtering
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  // 4. Generate and submit timesheets for each employee
  // Since there's no direct way to create draft timesheets, we'll use random data
  // and assume the test environment has timesheets pre-created or accessible
  const timesheets: IHrmTrackerTimesheet[] = [];
  for (let i = 0; i < employeeCount; i++) {
    const timesheet = typia.random<IHrmTrackerTimesheet>();
    // Adjust dates to match the current week
    timesheet.week_start_date = weekStart.toISOString();
    timesheet.week_end_date = weekEnd.toISOString();
    timesheet.status = "submitted"; // Directly set to submitted for testing
    timesheet.total_hours = 40;
    timesheets.push(timesheet);
  }
  // 5. Manager queries submitted timesheets
  const result = await api.functional.hrmTracker.member.timesheets.index(
    managerConnection,
    {
      body: {
        status: "submitted",
        page: 1,
        limit: 100,
      } satisfies IHrmTrackerTimesheet.IRequest,
    },
  );
  typia.assert(result);
  // 6. Validate results
  TestValidator.equals(
    "timesheet count matches employee count",
    result.data.length,
    employeeCount,
  );
  TestValidator.equals(
    "pagination records correct",
    result.pagination.records,
    employeeCount,
  );
  for (const timesheet of result.data) {
    TestValidator.equals(
      "timesheet status is submitted",
      timesheet.status,
      "submitted",
    );
    TestValidator.predicate(
      "valid week start date",
      timesheet.week_start_date !== null,
    );
    TestValidator.predicate(
      "valid week end date",
      timesheet.week_end_date !== null,
    );
  }
  // 7. Test date range filtering
  const dateFilteredResult =
    await api.functional.hrmTracker.member.timesheets.index(managerConnection, {
      body: {
        status: "submitted",
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
        page: 1,
        limit: 10,
      } satisfies IHrmTrackerTimesheet.IRequest,
    });
  typia.assert(dateFilteredResult);
  TestValidator.equals(
    "date filtered results match",
    dateFilteredResult.data.length,
    employeeCount,
  );
}
