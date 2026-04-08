import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization dashboard endpoint with empty organization state.
 *
 * Validates that the organization dashboard correctly handles the empty state scenario where a newly created organization has no employees, no timelogs, no timesheets, and no projects. This test ensures the dashboard returns appropriate default values (zeros for counts, empty arrays for lists) rather than null or undefined values.
 *
 * The test creates a fresh member account which automatically has an empty organization context, then verifies all dashboard metrics reflect the empty state accurately.
 *
 * 1. Member account is created and authenticated using authorize_member_join utility.
 * 2. Dashboard endpoint is called with the authenticated member connection.
 * 3. Response structure is validated using typia.assert().
 * 4. All numeric fields are verified to be 0 (activeEmployeesCount, totalHoursThisWeek, pendingTimesheetsCount).
 * 5. All array fields are verified to be empty arrays (projectsOverBudget, topEmployees).
 */
export async function test_api_organization_dashboard_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new member (automatically has empty organization)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Call the organization dashboard endpoint
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.organization.at(
      memberConnection,
    );
  // 3. Validate response structure
  typia.assert(dashboard);
  // 4. Validate numeric fields are 0 (not null or undefined)
  TestValidator.equals(
    "active employees count",
    dashboard.activeEmployeesCount,
    0,
  );
  TestValidator.equals(
    "total hours this week",
    dashboard.totalHoursThisWeek,
    0,
  );
  TestValidator.equals(
    "pending timesheets count",
    dashboard.pendingTimesheetsCount,
    0,
  );
  // 5. Validate array fields are empty arrays (not null)
  TestValidator.equals(
    "projects over budget array",
    dashboard.projectsOverBudget,
    [],
  );
  TestValidator.equals("top employees array", dashboard.topEmployees, []);
}
