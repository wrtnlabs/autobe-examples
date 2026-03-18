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

export async function test_api_organization_dashboard_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call dashboard API
  const dashboard =
    await api.functional.hrms.member.organization.dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate response structure
  TestValidator.predicate(
    "total active employees is non-negative",
    dashboard.totalActiveEmployees >= 0,
  );
  TestValidator.predicate(
    "total hours this week is non-negative",
    dashboard.totalHoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "pending timesheets count is non-negative",
    dashboard.pendingTimesheetsCount >= 0,
  );
  TestValidator.equals(
    "projects over budget is array",
    Array.isArray(dashboard.projectsOverBudget),
    true,
  );
  TestValidator.equals(
    "top employees is array",
    Array.isArray(dashboard.topEmployees),
    true,
  );
  TestValidator.predicate(
    "top employees max 5 entries",
    dashboard.topEmployees.length <= 5,
  );
  // 4. Validate generatedAt is valid timestamp
  const generatedAt = new Date(dashboard.generatedAt);
  const now = new Date();
  TestValidator.predicate(
    "generatedAt is current or future timestamp",
    generatedAt.getTime() <= now.getTime() + 60000,
  );
}
