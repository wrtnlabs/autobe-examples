import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test project budget report excludes projects without budget hours.
 *
 * Validates that the project budget report endpoint correctly filters out projects that do not have budget_hours specified, even when those projects have timelogs. This ensures the business rule that budget reports are only generated for projects with planned budget allocations is properly enforced.
 *
 * The test creates multiple projects with varying budget configurations and verifies the report filtering logic:
 * 1. Member authentication with email and password
 * 2. Project creation with and without budget_hours
 * 3. Timelog creation for all projects
 * 4. Budget report retrieval and validation
 * 5. Verification that only budgeted projects appear in the report
 *
 * 1. Authenticate as member user with valid credentials.
 * 2. Extract organization ID from member authentication response.
 * 3. Create a project with budget_hours specified (should be included in report).
 * 4. Create a project without budget_hours (should be excluded from report).
 * 5. Create timelog entries for both projects to ensure actual hours exist.
 * 6. Call the project budget report endpoint.
 * 7. Validate response contains only the project with budget_hours.
 * 8. Verify excluded project does not appear in report despite having timelogs.
 * 9. Check report structure matches IHrmProjectBudgetReport schema.
 * 10. Validate project_status and project_color_code fields are present.
 */
export async function test_api_project_budget_report_excludes_no_budget_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Extract organization ID from member authentication response
  // Note: In a real scenario, the member would need to be added to an organization first
  // For E2E testing with simulation mode, we use a valid UUID format
  const organizationId: string & tags.Format<"uuid"> =
    memberAuth.organizations && memberAuth.organizations.length > 0
      ? memberAuth.organizations[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // 3. Create project WITH budget_hours (should be included in report)
  const projectWithBudget =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        } satisfies IHrmProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(projectWithBudget);
  // 4. Create project WITHOUT budget_hours (should be excluded from report)
  const projectWithoutBudget =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
          // budget_hours intentionally omitted
        } satisfies IHrmProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(projectWithoutBudget);
  // 5. Create timelogs for both projects
  const timelogWithBudget =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: projectWithBudget.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IHrmTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(timelogWithBudget);
  const timelogWithoutBudget =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: projectWithoutBudget.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IHrmTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(timelogWithoutBudget);
  // 6. Call the project budget report endpoint
  const report: IHrmProjectBudgetReport =
    await api.functional.hrm.member.organizations.reports.project_budget.projectBudget(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(report);
  // 7. Validate response contains only the project with budget_hours
  TestValidator.equals(
    "report project_id matches the project with budget",
    report.project_id,
    projectWithBudget.id,
  );
  // 8. Verify excluded project does not appear in report
  TestValidator.predicate(
    "project without budget is excluded from report",
    report.project_id !== projectWithoutBudget.id,
  );
  // 9. Validate report structure matches IHrmProjectBudgetReport schema
  TestValidator.equals(
    "project name matches",
    report.project_name,
    projectWithBudget.name,
  );
  TestValidator.predicate(
    "budget hours is defined",
    report.budget_hours !== null &&
      report.budget_hours !== undefined,
  );
  TestValidator.predicate(
    "actual hours is a number",
    typeof report.actual_hours === "number",
  );
  TestValidator.predicate(
    "percentage consumed is a number",
    typeof report.percentage_consumed === "number",
  );
  // 10. Check that project_status and project_color_code are included
  TestValidator.predicate(
    "project status is included",
    report.project_status !== null &&
      report.project_status !== undefined,
  );
  TestValidator.predicate(
    "project color code is included",
    report.project_color_code !== null &&
      report.project_color_code !== undefined,
  );
}