import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test generating a budget consumption report for a project with defined budget hours.
 *
 * This test validates:
 * 1. Member authentication and project creation workflow
 * 2. Budget report generation with a project that has budget_hours defined
 * 3. Correct calculation of budget metrics (actual_hours, remaining_hours, consumption_percentage, is_over_budget)
 * 4. Response structure validation including project details and organization context
 */
export async function test_api_project_budget_report_with_consumption(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create project with budget_hours defined
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${RandomGenerator.alphabets(6)}`,
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Generate budget report for the project
  const budgetReport =
    await api.functional.hrmPlatform.member.projects.budget_report.budgetReport(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(budgetReport);
  // 4. Validate budget report structure and calculations
  TestValidator.equals("project ID matches", budgetReport.id, project.id);
  TestValidator.equals("project name matches", budgetReport.name, project.name);
  TestValidator.equals(
    "project status matches",
    budgetReport.status,
    project.status,
  );
  TestValidator.equals(
    "project color_code matches",
    budgetReport.color_code,
    project.color_code,
  );
  // 5. Validate budget metrics using actual project.budget_hours value
  TestValidator.equals(
    "budget_hours matches project",
    budgetReport.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "actual_hours is 0 (no timelogs)",
    budgetReport.actual_hours,
    0,
  );
  TestValidator.equals(
    "remaining_hours equals budget - actual",
    budgetReport.remaining_hours,
    project.budget_hours ?? 0,
  );
  TestValidator.equals(
    "consumption_percentage is 0",
    budgetReport.consumption_percentage,
    0,
  );
  TestValidator.equals(
    "is_over_budget is false",
    budgetReport.is_over_budget,
    false,
  );
  // 6. Validate organization context is present
  TestValidator.predicate(
    "organization exists",
    budgetReport.organization !== undefined,
  );
  TestValidator.predicate(
    "organization has valid ID",
    typeof budgetReport.organization.id === "string",
  );
  TestValidator.predicate(
    "organization has name",
    budgetReport.organization.name !== undefined,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof budgetReport.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof budgetReport.updated_at === "string",
  );
}
