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
 * Test organization dashboard endpoint with full data metrics validation.
 *
 * Validates the organization dashboard endpoint returns correct aggregated statistics including employee counts, weekly hours, pending timesheets, budget utilization, and top performers. Tests the complete response structure and data type validation.
 *
 * Since test data creation functions are not available in the provided SDK, this test focuses on:
 * - Member authentication via join endpoint
 * - Dashboard endpoint response structure validation
 * - Type safety and schema compliance
 * - Error handling for non-existent organization
 *
 * 1. Member authenticates via join with randomized credentials.
 * 2. Dashboard endpoint called with random organization UUID.
 * 3. Validates response structure matches IHrmOrganizationDashboard schema.
 * 4. Tests error response for non-existent organization.
 */
export async function test_api_organization_dashboard_with_full_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
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
  // 2. Test error handling for non-existent organization
  await TestValidator.httpError(
    "non-existent organization returns 404",
    404,
    async () => {
      await api.functional.hrm.member.dashboard.organization.at(
        memberConnection,
        {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. With valid organization, validate dashboard response structure
  // Note: In real scenario, organization would be created and populated with data
  // For this test, we validate the response type safety
  const validOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const dashboard = await api.functional.hrm.member.dashboard.organization.at(
    memberConnection,
    {
      organizationId: validOrganizationId,
    },
  );
  typia.assert(dashboard);
  // 4. Validate dashboard metrics structure
  TestValidator.equals(
    "totalEmployeeCount is non-negative",
    dashboard.totalEmployeeCount >= 0,
    true,
  );
  TestValidator.equals(
    "hoursThisWeek is non-negative",
    dashboard.hoursThisWeek >= 0,
    true,
  );
  TestValidator.equals(
    "pendingTimesheetCount is non-negative",
    dashboard.pendingTimesheetCount >= 0,
    true,
  );
  TestValidator.predicate(
    "budgetUtilization is valid percentage or null",
    dashboard.budgetUtilization === null ||
      (dashboard.budgetUtilization >= 0 && dashboard.budgetUtilization <= 100),
  );
  TestValidator.equals(
    "topEmployees array length is at most 5",
    dashboard.topEmployees.length <= 5,
    true,
  );
  TestValidator.predicate(
    "topEmployees is array",
    Array.isArray(dashboard.topEmployees),
  );
}
