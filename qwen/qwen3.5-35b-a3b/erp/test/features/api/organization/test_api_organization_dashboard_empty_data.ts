import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // Test the organization dashboard when there is minimal or no activity data
  // 1. Authenticate as a member (organization is created automatically during signup)
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization-specific connection for dashboard access
  const dashboardConnection: api.IConnection = { host: connection.host };
  dashboardConnection.headers = {
    ...dashboardConnection.headers,
    Authorization: authorized.token.access,
  };
  // 3. Call GET /hrms/member/dashboard/organization endpoint
  const dashboard: IHrmsOrganization =
    await api.functional.hrms.member.dashboard.organization.at(
      dashboardConnection,
    );
  typia.assert(dashboard);
  // 4. Verify totalActiveEmployees equals 0 (no employees created in test)
  TestValidator.equals(
    "total active employees should be 0",
    dashboard.totalActiveEmployees,
    0,
  );
  // 5. Verify totalHoursThisWeek equals 0 (no timelogs logged)
  TestValidator.equals(
    "total hours this week should be 0",
    dashboard.totalHoursThisWeek,
    0,
  );
  // 6. Verify pendingTimesheetsCount equals 0 (no timesheets submitted)
  TestValidator.equals(
    "pending timesheets count should be 0",
    dashboard.pendingTimesheetsCount,
    0,
  );
  // 7. Verify projectsOverBudget is an empty array (no projects created)
  TestValidator.equals(
    "projects over budget should be empty array",
    dashboard.projectsOverBudget,
    [],
  );
  // 8. Verify topEmployees is an empty array (no timelogs for ranking)
  TestValidator.equals(
    "top employees should be empty array",
    dashboard.topEmployees,
    [],
  );
  // 9. Verify generatedAt timestamp is present and valid
  TestValidator.predicate(
    "generatedAt timestamp should be present and valid",
    () => {
      if (!dashboard.generatedAt) return false;
      const date = new Date(dashboard.generatedAt);
      return !isNaN(date.getTime());
    },
  );
}
