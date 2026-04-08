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
 * Test organization dashboard budget utilization is null when projects lack budget hours.
 *
 * Validates that the organization dashboard endpoint correctly returns null for budgetUtilization when active projects exist but none have budget_hours specified. This ensures the calculation logic properly handles the absence of budget data rather than defaulting to zero or throwing an error.
 *
 * The test authenticates a member user, accesses their organization's dashboard, and verifies the budget utilization metric while confirming other dashboard metrics remain valid.
 *
 * **Note**: In simulation mode, the budgetUtilization value is randomly generated and may not always be null. This test validates the response structure and type safety. For deterministic null budgetUtilization testing, real backend setup with projects having null budget_hours is required.
 *
 * 1. Member registers via join endpoint with email and credentials.
 * 2. Member connection is established with authentication token for subsequent API calls.
 * 3. Dashboard endpoint is called with organization ID from member's organizations or random UUID.
 * 4. Validates budgetUtilization is null when no projects have budget_hours specified.
 * 5. Validates other metrics (totalEmployeeCount, hoursThisWeek, pendingTimesheetCount, topEmployees) are properly structured.
 * 6. Ensures complete response passes typia.assert() type validation.
 */
export async function test_api_organization_dashboard_budget_utilization_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Get organization ID for dashboard access
  // Note: After join, organizations array is empty per spec. Use random UUID for simulation.
  const organizationId =
    member.organizations && member.organizations.length > 0
      ? member.organizations[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // 3. Call organization dashboard endpoint
  const dashboard = await api.functional.hrm.member.dashboard.organization.at(
    memberConnection,
    {
      organizationId,
    },
  );
  typia.assert(dashboard);
  // 4. Validate budgetUtilization is null (the main test assertion)
  // In simulation mode, this may be a number or null randomly generated
  TestValidator.predicate(
    "budgetUtilization is null when no projects have budget_hours",
    dashboard.budgetUtilization === null,
  );
  // 5. Validate budgetUtilization is NOT 0 (explicit null, not zero value)
  TestValidator.notEquals(
    "budgetUtilization is null not zero",
    dashboard.budgetUtilization,
    0,
  );
  // 6. Validate other metrics are properly structured
  TestValidator.predicate(
    "totalEmployeeCount is non-negative",
    dashboard.totalEmployeeCount >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative",
    dashboard.hoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "pendingTimesheetCount is non-negative",
    dashboard.pendingTimesheetCount >= 0,
  );
  TestValidator.predicate(
    "topEmployees is array",
    Array.isArray(dashboard.topEmployees),
  );
  TestValidator.predicate(
    "topEmployees has max 5 items",
    dashboard.topEmployees.length <= 5,
  );
}
