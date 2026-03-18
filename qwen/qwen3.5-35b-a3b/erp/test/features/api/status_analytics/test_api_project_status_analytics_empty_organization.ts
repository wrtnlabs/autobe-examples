import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_status_analytics_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member (creates fresh organization context with no projects)
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joined);
  // 2. Get the member's connection (headers updated by authorize_member_join)
  // Note: memberConnection.headers is now updated internally by authorize_member_join
  // 3. Call status analytics endpoint
  const analytics =
    await api.functional.hrms.member.projects.status_analytics.at(
      memberConnection,
    );
  typia.assert(analytics);
  // 4. Validate empty state
  TestValidator.equals("analytics array is empty", analytics.analytics, []);
  TestValidator.equals("total projects is zero", analytics.total_projects, 0);
  TestValidator.equals(
    "total budget hours is null (no projects)",
    analytics.total_budget_hours,
    null,
  );
  TestValidator.equals(
    "total logged hours is null (no timelogs)",
    analytics.total_logged_hours,
    null,
  );
}