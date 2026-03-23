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
 * Test generating a budget consumption report for a project without budget hours defined.
 *
 * This test validates that the budget report endpoint correctly handles projects
 * where budget_hours is null. The system should:
 * 1. Return null for all budget-related calculated fields (remaining_hours, consumption_percentage, is_over_budget)
 * 2. Still return actual_hours (0 if no timelogs exist)
 * 3. Include all project details (name, status, color_code, organization)
 * 4. Not throw any errors when budget_hours is null
 */
export async function test_api_project_budget_report_without_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a project WITHOUT budget hours (explicitly null)
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
          budget_hours: null, // Explicitly set to null for this test
        },
      },
    );
  typia.assert(project);
  // 3. Verify the project was created with null budget_hours
  TestValidator.equals(
    "project has null budget_hours",
    project.budget_hours,
    null,
  );
  // 4. Generate budget report for the project without budget
  const report: IHrmPlatformProject.IBudgetReport =
    await api.functional.hrmPlatform.member.projects.budget_report.budgetReport(
      memberConnection,
      {
        projectId: project.id,
        body: {}, // Empty body - no date filters
      },
    );
  typia.assert(report);
  // 5. Validate budget report response
  // Budget hours should be null
  TestValidator.equals("budget_hours is null", report.budget_hours, null);
  // Actual hours should be 0 (no timelogs created)
  TestValidator.equals("actual_hours is 0", report.actual_hours, 0);
  // Remaining hours should be null (because budget_hours is null)
  TestValidator.equals("remaining_hours is null", report.remaining_hours, null);
  // Consumption percentage should be null (because budget_hours is null)
  TestValidator.equals(
    "consumption_percentage is null",
    report.consumption_percentage,
    null,
  );
  // Is over budget should be null (because budget_hours is null)
  TestValidator.equals("is_over_budget is null", report.is_over_budget, null);
  // Project details should still be returned correctly
  TestValidator.equals("project id matches", report.id, project.id);
  TestValidator.equals("project name matches", report.name, project.name);
  TestValidator.equals("project status matches", report.status, project.status);
  TestValidator.equals(
    "project color_code matches",
    report.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "description matches",
    report.description,
    project.description,
  );
  // Organization should be present and valid
  TestValidator.predicate(
    "organization exists",
    report.organization !== null && report.organization !== undefined,
  );
  typia.assert(report.organization);
  TestValidator.predicate(
    "organization has id",
    report.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization has name",
    report.organization.name.length > 0,
  );
  // Timestamps should be present
  TestValidator.predicate("created_at exists", report.created_at.length > 0);
  TestValidator.predicate("updated_at exists", report.updated_at.length > 0);
}
