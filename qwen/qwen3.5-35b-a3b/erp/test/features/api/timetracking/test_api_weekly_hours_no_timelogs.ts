import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_hours_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (automatically creates organization with Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
      href: "https://example.com/dashboard",
      referrer: "https://example.com/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Since we don't have employee creation utilities, test with a mock employee UUID
  // In production, this would be a valid employee ID from the system
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call weekly hours endpoint with authenticated member connection
  const weeklyStats =
    await api.functional.hrmPlatform.member.timetracking.weekly_hours.at(
      memberConnection,
      {
        employeeId,
      },
    );
  typia.assert(weeklyStats);
  // 4. Validate zero hours for employees without timelogs
  TestValidator.equals("total hours is zero", weeklyStats.total_hours, 0.0);
  TestValidator.equals(
    "billable hours is zero",
    weeklyStats.billable_hours,
    0.0,
  );
  // 5. Validate all count fields are zero
  TestValidator.equals(
    "timesheet count is zero",
    weeklyStats.timesheet_count,
    0,
  );
  TestValidator.equals(
    "draft timesheet count is zero",
    weeklyStats.draft_timesheet_count,
    0,
  );
  TestValidator.equals(
    "submitted timesheet count is zero",
    weeklyStats.submitted_timesheet_count,
    0,
  );
  TestValidator.equals(
    "approved timesheet count is zero",
    weeklyStats.approved_timesheet_count,
    0,
  );
  TestValidator.equals(
    "rejected timesheet count is zero",
    weeklyStats.rejected_timesheet_count,
    0,
  );
  // 6. Validate week boundaries are present and valid
  TestValidator.predicate(
    "week_start is valid date-time",
    () => !isNaN(new Date(weeklyStats.week_start).getTime()),
  );
  TestValidator.predicate(
    "week_end is valid date-time",
    () => !isNaN(new Date(weeklyStats.week_end).getTime()),
  );
  // 7. Validate organization reference is present
  TestValidator.notEquals(
    "organization exists in response",
    weeklyStats.organization,
    null,
  );
  // 8. Validate employee reference is present
  TestValidator.notEquals(
    "employee exists in response",
    weeklyStats.employee,
    null,
  );
}
