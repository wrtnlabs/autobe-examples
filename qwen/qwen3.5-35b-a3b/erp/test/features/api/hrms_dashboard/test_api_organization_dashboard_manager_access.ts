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

export async function test_api_organization_dashboard_manager_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up test user connection with proper authentication
  const testUserConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(testUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  // 2. Call the organization dashboard endpoint
  const dashboard =
    await api.functional.hrms.member.dashboard.organization.at(
      testUserConnection,
    );
  typia.assert(dashboard);
  // 3. Validate totalActiveEmployees count
  TestValidator.equals(
    "total active employees count",
    dashboard.totalActiveEmployees,
    typia.assert<number & tags.Type<"int32">>(0),
  );
  // 4. Validate totalHoursThisWeek is a valid number
  TestValidator.predicate(
    "total hours this week is a valid number",
    typeof dashboard.totalHoursThisWeek === "number" &&
      dashboard.totalHoursThisWeek >= 0,
  );
  // 5. Validate pendingTimesheetsCount
  TestValidator.equals(
    "pending timesheets count",
    dashboard.pendingTimesheetsCount,
    typia.assert<number & tags.Type<"int32">>(0),
  );
  // 6. Validate projectsOverBudget is an array
  TestValidator.equals(
    "projects over budget is an array",
    Array.isArray(dashboard.projectsOverBudget),
    true,
  );
  // 7. Validate topEmployees is an array
  TestValidator.equals(
    "top employees is an array",
    Array.isArray(dashboard.topEmployees),
    true,
  );
  // 8. Validate generatedAt timestamp is valid ISO date-time
  const generatedAt = new Date(dashboard.generatedAt);
  TestValidator.predicate(
    "generatedAt is a valid date-time",
    !isNaN(generatedAt.getTime()),
  );
  // 9. Validate generatedAt is recent (within last minute)
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - generatedAt.getTime());
  TestValidator.predicate("generatedAt timestamp is recent", timeDiff < 60000);
}
