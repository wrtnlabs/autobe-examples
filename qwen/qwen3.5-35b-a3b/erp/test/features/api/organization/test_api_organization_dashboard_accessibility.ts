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

export async function test_api_organization_dashboard_accessibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (automatically creates organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(memberAuthorized);
  // 2. Create actor-specific connection for dashboard API call with token
  const dashboardConnection: api.IConnection = { host: connection.host };
  dashboardConnection.headers = {
    ...dashboardConnection.headers,
    Authorization: memberAuthorized.token.access,
  };
  // 3. Retrieve organization dashboard
  const dashboard: IHrmsOrganization =
    await api.functional.hrms.member.organization_dashboard.getDashboard(
      dashboardConnection,
    );
  typia.assert(dashboard);
  // 4. Validate required fields exist and have appropriate default values
  TestValidator.equals(
    "total active employees is non-negative",
    dashboard.totalActiveEmployees,
    0,
  );
  TestValidator.equals(
    "total hours this week is non-negative",
    dashboard.totalHoursThisWeek,
    0,
  );
  TestValidator.equals(
    "pending timesheets count is non-negative",
    dashboard.pendingTimesheetsCount,
    0,
  );
  TestValidator.equals(
    "projects over budget is array",
    Array.isArray(dashboard.projectsOverBudget),
    true,
  );
  TestValidator.equals(
    "projects over budget is empty array for new org",
    dashboard.projectsOverBudget.length,
    0,
  );
  TestValidator.equals(
    "top employees is array",
    Array.isArray(dashboard.topEmployees),
    true,
  );
  TestValidator.equals(
    "top employees is empty array for new org",
    dashboard.topEmployees.length,
    0,
  );
  // generatedAt is validated by typia.assert(dashboard) which includes all fields including timestamps
}
