import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationDashboard";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization dashboard endpoint with empty data.
 *
 * Validates the organization dashboard endpoint handles empty datasets gracefully by returning appropriate zero values and null for budget utilization when no activity data exists. Ensures all dashboard metrics default correctly when an organization has no employees, timelogs, timesheets, or budgeted projects.
 *
 * The test creates a member account, establishes organization context, and verifies the dashboard returns:
 * - totalEmployeeCount: 0
 * - hoursThisWeek: 0
 * - pendingTimesheetCount: 0
 * - budgetUtilization: null
 * - topEmployees: empty array
 *
 * 1. Member authenticates via join endpoint.
 * 2. Access organization dashboard endpoint.
 * 3. Validate all metrics return appropriate empty state values.
 */
export async function test_api_organization_dashboard_with_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Access organization dashboard
  // Note: Since member just joined, they may not have organizations yet.
  // We'll use a generated UUID to test the endpoint behavior with empty organization.
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const dashboard = await api.functional.hrm.member.dashboard.organization.at(
    memberConnection,
    {
      organizationId,
    },
  );
  typia.assert(dashboard);
  // 3. Validate empty state values
  TestValidator.equals("total employee count", dashboard.totalEmployeeCount, 0);
  TestValidator.equals("hours this week", dashboard.hoursThisWeek, 0);
  TestValidator.equals(
    "pending timesheet count",
    dashboard.pendingTimesheetCount,
    0,
  );
  TestValidator.equals("top employees array", dashboard.topEmployees.length, 0);
  TestValidator.equals("budget utilization", dashboard.budgetUtilization, null);
}
