import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationDashboard";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test that the organization dashboard returns safe empty-state defaults for an organization with no data.
 *
 * Validates that the dashboard aggregation logic in the backend handles the empty/zero state gracefully without producing null pointer exceptions, database errors, or invalid responses. The dashboard should return safe default values (zeros and empty arrays) instead of errors or null fields when no data exists.
 *
 * 1. Register a new member via `authorize_member_join`.
 * 2. Create an organization with USD currency, Asia/Seoul timezone, and fiscal start month 1.
 * 3. Do NOT add any employees, projects, timelogs, or timesheets — keeping the organization in an empty state.
 * 4. Retrieve the dashboard via the GET organization dashboard endpoint.
 * 5. Validate that the dashboard returns safe default values: zero active employee count, zero weekly hours, zero pending timesheets, empty budget alerts array, and empty top employees array.
 */
export async function test_api_organization_dashboard_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization with specific configuration
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Retrieve the dashboard for the empty organization
  const dashboard =
    await api.functional.hrmTimeTracking.member.dashboard.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 4. Validate dashboard returns safe zero/default values for empty organization
  TestValidator.equals("activeEmployeeCount", dashboard.activeEmployeeCount, 0);
  TestValidator.equals("weeklyHours", dashboard.weeklyHours, 0);
  TestValidator.equals(
    "pendingTimesheetCount",
    dashboard.pendingTimesheetCount,
    0,
  );
  TestValidator.equals("budgetAlerts", dashboard.budgetAlerts, []);
  TestValidator.equals("topEmployees", dashboard.topEmployees, []);
}
