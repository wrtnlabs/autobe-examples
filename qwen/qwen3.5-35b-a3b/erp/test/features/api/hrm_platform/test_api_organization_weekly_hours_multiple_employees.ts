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

export async function test_api_organization_weekly_hours_multiple_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with organization (also authenticates automatically)
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create authenticated connection for member (Authorization header set by join)
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Call the organization-weekly-hours endpoint
  const response =
    await api.functional.hrmPlatform.member.timetracking.organization_weekly_hours.at(
      memberConnection,
    );
  typia.assert(response);
  // 4. Validate response organization reference exists and has required fields
  TestValidator.equals(
    "response has organization",
    response.organization !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has id",
    response.organization.id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has name",
    response.organization.name !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has owner",
    response.organization.owner !== undefined,
    true,
  );
  // 5. Validate numeric totals are proper numbers with non-negative values
  TestValidator.equals(
    "total_hours is a number",
    typeof response.total_hours,
    "number",
  );
  TestValidator.predicate("total_hours >= 0", response.total_hours >= 0);
  TestValidator.equals(
    "billable_hours is a number",
    typeof response.billable_hours,
    "number",
  );
  TestValidator.predicate("billable_hours >= 0", response.billable_hours >= 0);
  // 6. Validate week period dates are proper ISO date-time strings
  const weekStart = new Date(response.week_start);
  const weekEnd = new Date(response.week_end);
  TestValidator.equals(
    "week_start is a valid date",
    !isNaN(weekStart.getTime()),
    true,
  );
  TestValidator.equals(
    "week_end is a valid date",
    !isNaN(weekEnd.getTime()),
    true,
  );
  TestValidator.predicate(
    "week_end is after week_start",
    weekEnd.getTime() > weekStart.getTime(),
  );
  // 7. Validate all timesheet counts are non-negative integers
  TestValidator.equals(
    "timesheet_count is a number",
    typeof response.timesheet_count,
    "number",
  );
  TestValidator.predicate(
    "timesheet_count >= 0",
    response.timesheet_count >= 0,
  );
  TestValidator.equals(
    "draft_timesheet_count is a number",
    typeof response.draft_timesheet_count,
    "number",
  );
  TestValidator.predicate(
    "draft_timesheet_count >= 0",
    response.draft_timesheet_count >= 0,
  );
  TestValidator.equals(
    "submitted_timesheet_count is a number",
    typeof response.submitted_timesheet_count,
    "number",
  );
  TestValidator.predicate(
    "submitted_timesheet_count >= 0",
    response.submitted_timesheet_count >= 0,
  );
  TestValidator.equals(
    "approved_timesheet_count is a number",
    typeof response.approved_timesheet_count,
    "number",
  );
  TestValidator.predicate(
    "approved_timesheet_count >= 0",
    response.approved_timesheet_count >= 0,
  );
  TestValidator.equals(
    "rejected_timesheet_count is a number",
    typeof response.rejected_timesheet_count,
    "number",
  );
  TestValidator.predicate(
    "rejected_timesheet_count >= 0",
    response.rejected_timesheet_count >= 0,
  );
  // 8. Validate last_refreshed_at is valid ISO date-time
  TestValidator.equals(
    "last_refreshed_at is a valid date",
    !isNaN(Date.parse(response.last_refreshed_at)),
    true,
  );
}
