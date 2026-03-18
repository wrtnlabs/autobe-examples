import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_dashboard_no_assignments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const authConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: authorizedMember.token.access,
    },
  };
  // 3. Call dashboard endpoint for member with no projects
  const dashboardResponse =
    await api.functional.hrms.member.projects.dashboard(memberConnection);
  typia.assert(dashboardResponse);
  // 4. Validate response structure and empty state
  TestValidator.equals(
    "dashboard type is personal",
    dashboardResponse.dashboard_type,
    "personal",
  );
  TestValidator.predicate(
    "generation timestamp is valid ISO datetime",
    () => !isNaN(Date.parse(dashboardResponse.generation_timestamp)),
  );
  // 5. Validate empty state for optional arrays (user has no projects/tasks)
  TestValidator.equals(
    "assigned tasks is empty or undefined (no project assignments)",
    dashboardResponse.assigned_tasks?.length ?? 0,
    0,
  );
  TestValidator.equals(
    "budget alerts is empty or undefined (no project allocations)",
    dashboardResponse.budget_alerts?.length ?? 0,
    0,
  );
  TestValidator.equals(
    "top employees is empty or undefined (no activity data)",
    dashboardResponse.top_employees?.length ?? 0,
    0,
  );
}
