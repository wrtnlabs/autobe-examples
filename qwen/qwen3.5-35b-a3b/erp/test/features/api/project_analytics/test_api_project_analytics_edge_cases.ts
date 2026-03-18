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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_analytics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Extract organization ID from member's organization memberships
  const organizationId =
    memberAuth.organization_memberships[0]?.organization.id;
  if (!organizationId) {
    throw new Error("No organization found for member");
  }
  // Create a test project with null budget_hours
  const projectWithNullBudget =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Project With Null Budget",
          color_code: RandomGenerator.alphaNumeric(6),
          budget_hours: null,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(projectWithNullBudget);
  // Create a test project with budget_hours = 0
  const projectWithZeroBudget =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Project With Zero Budget",
          color_code: RandomGenerator.alphaNumeric(6),
          budget_hours: 0,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(projectWithZeroBudget);
  // Create a test project with normal budget_hours
  const projectWithNormalBudget =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Project With Normal Budget",
          color_code: RandomGenerator.alphaNumeric(6),
          budget_hours: 100,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(projectWithNormalBudget);
  // Query project analytics
  const analytics = await api.functional.hrms.member.projects.analytics.index(
    memberConnection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(analytics);
  // Find the created projects in the response
  const projectMap = new Map(analytics.data.map((p) => [p.id, p]));
  // Test 1: Project with null budget_hours should have null budget_utilization_percentage
  const nullBudgetProject = projectMap.get((projectWithNullBudget as any).id);
  TestValidator.predicate(
    "null budget project exists in analytics",
    nullBudgetProject !== undefined,
  );
  if (nullBudgetProject) {
    TestValidator.equals(
      "null budget project has null budget_utilization_percentage",
      nullBudgetProject.budget_utilization_percentage,
      null,
    );
    TestValidator.equals(
      "null budget project has correct planned_hours",
      nullBudgetProject.planned_hours,
      0,
    );
    TestValidator.equals(
      "null budget project has correct budget_hours",
      nullBudgetProject.budget_hours,
      null,
    );
  }
  // Test 2: Project with budget_hours = 0 should have null budget_utilization_percentage
  const zeroBudgetProject = projectMap.get((projectWithZeroBudget as any).id);
  TestValidator.predicate(
    "zero budget project exists in analytics",
    zeroBudgetProject !== undefined,
  );
  if (zeroBudgetProject) {
    TestValidator.equals(
      "zero budget project has null budget_utilization_percentage",
      zeroBudgetProject.budget_utilization_percentage,
      null,
    );
    TestValidator.equals(
      "zero budget project has zero planned_hours",
      zeroBudgetProject.planned_hours,
      0,
    );
    TestValidator.equals(
      "zero budget project has zero budget_hours",
      zeroBudgetProject.budget_hours,
      0,
    );
  }
  // Test 3: Project with no timelogs should have actual_hours = 0
  const normalBudgetProject = projectMap.get((projectWithNormalBudget as any).id);
  TestValidator.predicate(
    "normal budget project exists in analytics",
    normalBudgetProject !== undefined,
  );
  if (normalBudgetProject) {
    TestValidator.equals(
      "project with no timelogs has actual_hours = 0",
      normalBudgetProject.actual_hours,
      0,
    );
    TestValidator.equals(
      "project with no timelogs has null budget_utilization_percentage (no timelogs, no division)",
      normalBudgetProject.budget_utilization_percentage,
      0,
    );
  }
  // Test 4: All created projects should have zero task counts (no tasks created)
  if (nullBudgetProject) {
    TestValidator.equals(
      "project with null budget has zero task counts",
      nullBudgetProject.total_tasks,
      0,
    );
    TestValidator.equals(
      "project with null budget has zero pending_tasks",
      nullBudgetProject.pending_tasks,
      0,
    );
    TestValidator.equals(
      "project with null budget has zero in_progress_tasks",
      nullBudgetProject.in_progress_tasks,
      0,
    );
    TestValidator.equals(
      "project with null budget has zero completed_tasks",
      nullBudgetProject.completed_tasks,
      0,
    );
    TestValidator.equals(
      "project with null budget has zero closed_tasks",
      nullBudgetProject.closed_tasks,
      0,
    );
  }
  // Test 5: Test empty result set with filter that matches no projects
  const emptyAnalytics =
    await api.functional.hrms.member.projects.analytics.index(
      memberConnection,
      {
        body: {
          status: "completed",
          limit: 10,
        },
      },
    );
  typia.assert(emptyAnalytics);
  TestValidator.equals(
    "empty filter returns zero records",
    emptyAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter returns zero pages",
    emptyAnalytics.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filter returns empty data array",
    emptyAnalytics.data.length,
    0,
  );
}