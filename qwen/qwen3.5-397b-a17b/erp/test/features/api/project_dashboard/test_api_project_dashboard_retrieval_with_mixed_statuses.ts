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

export async function test_api_project_dashboard_retrieval_with_mixed_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (organization owner with report:view permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
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
  typia.assert(authorized);
  // 2. Retrieve project dashboard statistics
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.projects.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate dashboard structure and data integrity
  TestValidator.predicate(
    "total projects is non-negative",
    dashboard.totalProjects >= 0,
  );
  // 4. Validate status breakdown consistency
  const { active, archived, completed } = dashboard.statusBreakdown;
  TestValidator.predicate("active count is non-negative", active >= 0);
  TestValidator.predicate("archived count is non-negative", archived >= 0);
  TestValidator.predicate("completed count is non-negative", completed >= 0);
  TestValidator.equals(
    "status breakdown sums to total",
    active + archived + completed,
    dashboard.totalProjects,
  );
  // 5. Validate budget utilization array structure
  TestValidator.predicate(
    "budget utilization is array",
    Array.isArray(dashboard.budgetUtilization),
  );
  for (const budget of dashboard.budgetUtilization) {
    TestValidator.predicate(
      "project id is uuid",
      /^[0-9a-f-]{36}$/i.test(budget.projectId),
    );
    TestValidator.predicate(
      "budget hours is non-negative or null",
      budget.budgetHours === null || budget.budgetHours >= 0,
    );
    TestValidator.predicate(
      "actual hours is non-negative",
      budget.actualHours >= 0,
    );
    TestValidator.predicate(
      "consumption percentage > 80 or null",
      budget.consumptionPercentage === null ||
        budget.consumptionPercentage > 80,
    );
    // Validate consumption percentage calculation when budget exists
    if (budget.budgetHours !== null && budget.consumptionPercentage !== null) {
      const calculatedPercentage =
        (budget.actualHours / budget.budgetHours) * 100;
      TestValidator.predicate(
        "consumption percentage calculated correctly",
        Math.abs(calculatedPercentage - budget.consumptionPercentage) < 0.01,
      );
    }
    // Validate remaining hours calculation when budget exists
    if (budget.budgetHours !== null) {
      const expectedRemaining = budget.budgetHours - budget.actualHours;
      TestValidator.predicate(
        "remaining hours calculated correctly",
        Math.abs((budget.remainingHours ?? 0) - expectedRemaining) < 0.01,
      );
    }
  }
  // 6. Validate top projects by hours array structure
  TestValidator.predicate(
    "top projects is array",
    Array.isArray(dashboard.topProjectsByHours),
  );
  TestValidator.predicate(
    "top projects limited to 5",
    dashboard.topProjectsByHours.length <= 5,
  );
  for (const project of dashboard.topProjectsByHours) {
    TestValidator.predicate(
      "project id is uuid",
      /^[0-9a-f-]{36}$/i.test(project.projectId),
    );
    TestValidator.predicate(
      "project name is string",
      typeof project.projectName === "string",
    );
    TestValidator.predicate(
      "total hours logged is non-negative",
      project.totalHoursLogged >= 0,
    );
  }
  // 7. Validate top projects are sorted by hours logged (descending)
  if (dashboard.topProjectsByHours.length > 1) {
    for (let i = 0; i < dashboard.topProjectsByHours.length - 1; i++) {
      TestValidator.predicate(
        "top projects sorted by hours descending",
        dashboard.topProjectsByHours[i].totalHoursLogged >=
          dashboard.topProjectsByHours[i + 1].totalHoursLogged,
      );
    }
  }
}
