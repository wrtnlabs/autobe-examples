import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
import type { IHrmPlatformProjectDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project dashboard retrieval for a newly created organization with no projects.
 *
 * Scenario:
 * 1. Create a new member account (automatically creates fresh organization)
 * 2. Retrieve project dashboard for the empty organization
 * 3. Validate empty state: totalProjects=0, all status counts=0, empty arrays for budgetUtilization and topProjectsByHours
 */
export async function test_api_project_dashboard_empty_organization_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account (fresh organization with no projects)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve project dashboard for empty organization
  const dashboard: IHrmPlatformProjectDashboard =
    await api.functional.hrmPlatform.member.dashboard.projects.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate empty state
  TestValidator.equals("total projects count", dashboard.totalProjects, 0);
  TestValidator.equals(
    "active projects count",
    dashboard.statusBreakdown.active,
    0,
  );
  TestValidator.equals(
    "archived projects count",
    dashboard.statusBreakdown.archived,
    0,
  );
  TestValidator.equals(
    "completed projects count",
    dashboard.statusBreakdown.completed,
    0,
  );
  TestValidator.predicate(
    "budget utilization is empty",
    dashboard.budgetUtilization.length === 0,
  );
  TestValidator.predicate(
    "top projects by hours is empty",
    dashboard.topProjectsByHours.length === 0,
  );
}
