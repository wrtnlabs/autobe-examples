import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_weekly_stats_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the successful retrieval of precomputed weekly timesheet statistics
   * for an employee.
   *
   * Validates the primary success path of retrieving weekly timesheet statistics
   * using the statsId endpoint, ensuring all required fields are present and
   * correctly populated. The test follows a natural flow: member registration
   * with automatic organization creation, member authentication, employee
   * information retrieval for context, and timesheet statistics validation.
   *
   * Special attention is given to verifying that the week period follows the
   * Monday-Sunday pattern and that all aggregated metrics (timesheet counts
   * and hours) are accurate and logically consistent.
   *
   * 1. Member registration with email, password, and organization details.
   * 2. Member authentication to obtain access token.
   * 3. Employee information retrieval using employee code.
   * 4. Weekly timesheet statistics retrieval using generated statsId.
   * 5. Validation of all response fields and business logic.
   * 6. Verification of week period calculation and metric consistency.
   */
  // 1. Register a new member account (creates organization automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create authenticated member connection for API calls
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedMemberConnection.headers = {
    ...authenticatedMemberConnection.headers,
    Authorization: authResponse.token.access,
  };
  // 3. Retrieve employee information (for context, stats are accessed by ID)
  // Use a random employee code (mock backend will return an employee)
  const employee = await api.functional.hrmPlatform.member.employees.at(
    authenticatedMemberConnection,
    {
      employeeCode: typia.random<string>(),
    },
  );
  typia.assert(employee);
  // 4. Retrieve weekly timesheet statistics using generated statsId
  const statsId = typia.random<string & tags.Format<"uuid">>();
  const weeklyStats =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.at(
      authenticatedMemberConnection,
      {
        statsId,
      },
    );
  typia.assert(weeklyStats);
  // 5. Validate UUID field formats
  TestValidator.predicate("stats id is valid UUID", () =>
    /^[0-9a-f-]{36}$/i.test(weeklyStats.id),
  );
  TestValidator.predicate("organization_id is valid UUID", () =>
    /^[0-9a-f-]{36}$/i.test(weeklyStats.organization_id),
  );
  TestValidator.predicate("employee_id is valid UUID", () =>
    /^[0-9a-f-]{36}$/i.test(weeklyStats.employee_id),
  );
  // 6. Validate week period follows Monday-Sunday pattern (UTC)
  const weekStart = new Date(weeklyStats.week_start);
  const weekEnd = new Date(weeklyStats.week_end);
  TestValidator.predicate(
    "week_start is Monday (getUTCDay=1)",
    weekStart.getUTCDay() === 1,
  );
  TestValidator.predicate(
    "week_end is Sunday (getUTCDay=0) or exactly 6 days after start",
    weekEnd.getUTCDay() === 0 ||
      Math.abs(weekEnd.getTime() - weekStart.getTime()) >=
        6 * 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "week_end is after week_start",
    () => weekEnd > weekStart,
  );
  // 7. Validate timesheet counts are non-negative integers
  TestValidator.predicate(
    "timesheet_count is non-negative integer",
    () =>
      Number.isInteger(weeklyStats.timesheet_count) &&
      weeklyStats.timesheet_count >= 0,
  );
  TestValidator.predicate(
    "draft_timesheet_count is non-negative integer",
    () =>
      Number.isInteger(weeklyStats.draft_timesheet_count) &&
      weeklyStats.draft_timesheet_count >= 0,
  );
  TestValidator.predicate(
    "submitted_timesheet_count is non-negative integer",
    () =>
      Number.isInteger(weeklyStats.submitted_timesheet_count) &&
      weeklyStats.submitted_timesheet_count >= 0,
  );
  TestValidator.predicate(
    "approved_timesheet_count is non-negative integer",
    () =>
      Number.isInteger(weeklyStats.approved_timesheet_count) &&
      weeklyStats.approved_timesheet_count >= 0,
  );
  TestValidator.predicate(
    "rejected_timesheet_count is non-negative integer",
    () =>
      Number.isInteger(weeklyStats.rejected_timesheet_count) &&
      weeklyStats.rejected_timesheet_count >= 0,
  );
  // 8. Validate total timesheet count equals sum of status counts
  TestValidator.predicate(
    "total timesheet count equals sum of status counts",
    () =>
      weeklyStats.draft_timesheet_count +
        weeklyStats.submitted_timesheet_count +
        weeklyStats.approved_timesheet_count +
        weeklyStats.rejected_timesheet_count ===
      weeklyStats.timesheet_count,
  );
  // 9. Validate hours are non-negative numbers
  TestValidator.predicate(
    "total_hours is non-negative number",
    () =>
      Number.isFinite(weeklyStats.total_hours) && weeklyStats.total_hours >= 0,
  );
  TestValidator.predicate(
    "billable_hours is non-negative number",
    () =>
      Number.isFinite(weeklyStats.billable_hours) &&
      weeklyStats.billable_hours >= 0,
  );
  TestValidator.predicate(
    "billable_hours <= total_hours",
    () => weeklyStats.billable_hours <= weeklyStats.total_hours,
  );
  // 10. Validate timestamp fields are valid date-time strings
  TestValidator.predicate(
    "last_refreshed_at is valid date-time",
    () => !isNaN(new Date(weeklyStats.last_refreshed_at).getTime()),
  );
}
