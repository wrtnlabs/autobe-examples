import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test project budget report retrieval with utilization calculation.
 *
 * This test validates the budget report endpoint by:
 * 1. Authenticating as a member
 * 2. Creating projects with and without budget hours
 * 3. Creating timelogs against projects with budget hours
 * 4. Retrieving the budget report and validating all calculations
 * 5. Verifying projects without budget hours are excluded
 * 6. Confirming pagination metadata accuracy
 */
export async function test_api_project_budget_report_retrieval_with_utilization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create projects with budget hours (should appear in report)
  const projectWithBudget1 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#FF5733",
          status: "active",
          budget_hours: 100,
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithBudget1);
  const projectWithBudget2 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#33FF57",
          status: "active",
          budget_hours: 200,
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithBudget2);
  // 3. Create project without budget hours (should NOT appear in report)
  const projectWithoutBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3357FF",
          status: "active",
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithoutBudget);
  // 4. Create timelogs for projects with budget hours
  // Project 1: 30 minutes + 30 minutes = 60 minutes = 1 hour (1% utilization of 100 hours)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 30,
        projectId: projectWithBudget1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 30,
        projectId: projectWithBudget1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Project 2: 60 minutes = 1 hour (0.5% utilization of 200 hours)
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 60,
        projectId: projectWithBudget2.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // 5. Request budget report without filters
  const report = await api.functional.hrmPlatform.member.reports.budget.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformProjectBudgetReport.IRequest,
    },
  );
  typia.assert(report);
  // 6. Validate pagination metadata
  TestValidator.predicate("current page is 1", report.pagination.current === 1);
  TestValidator.predicate("limit is positive", report.pagination.limit > 0);
  TestValidator.predicate(
    "records count is positive",
    report.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count is positive",
    report.pagination.pages > 0,
  );
  TestValidator.equals(
    "pages calculation",
    report.pagination.pages,
    Math.ceil(report.pagination.records / report.pagination.limit),
  );
  // 7. Validate report data
  TestValidator.predicate("report contains data", report.data.length > 0);
  TestValidator.predicate(
    "projects without budget excluded",
    !report.data.some((entry) => entry.id === projectWithoutBudget.id),
  );
  // 8. Find and validate project entries
  const project1Entry = report.data.find(
    (entry) => entry.id === projectWithBudget1.id,
  );
  const project2Entry = report.data.find(
    (entry) => entry.id === projectWithBudget2.id,
  );
  TestValidator.predicate("project 1 in report", project1Entry !== undefined);
  TestValidator.predicate("project 2 in report", project2Entry !== undefined);
  if (project1Entry !== undefined && project2Entry !== undefined) {
    // Validate project 1 entry
    TestValidator.equals(
      "project 1 id",
      project1Entry.id,
      projectWithBudget1.id,
    );
    TestValidator.equals(
      "project 1 name",
      project1Entry.name,
      projectWithBudget1.name,
    );
    TestValidator.equals(
      "project 1 color",
      project1Entry.color,
      projectWithBudget1.color_code,
    );
    TestValidator.equals(
      "project 1 status",
      project1Entry.status,
      typia.assert<"active" | "archived" | "completed" | null | undefined>(projectWithBudget1.status),
    );
    TestValidator.equals(
      "project 1 budget hours",
      project1Entry.budget_hours,
      100,
    );
    TestValidator.equals(
      "project 1 actual hours",
      project1Entry.actual_hours,
      1,
    ); // 60 minutes / 60 = 1 hour
    TestValidator.equals(
      "project 1 utilization",
      project1Entry.utilization_percentage,
      (1 / 100) * 100,
    );
    // Validate project 2 entry
    TestValidator.equals(
      "project 2 id",
      project2Entry.id,
      projectWithBudget2.id,
    );
    TestValidator.equals(
      "project 2 name",
      project2Entry.name,
      projectWithBudget2.name,
    );
    TestValidator.equals(
      "project 2 color",
      project2Entry.color,
      projectWithBudget2.color_code,
    );
    TestValidator.equals(
      "project 2 status",
      project2Entry.status,
      typia.assert<"active" | "archived" | "completed" | null | undefined>(projectWithBudget2.status),
    );
    TestValidator.equals(
      "project 2 budget hours",
      project2Entry.budget_hours,
      200,
    );
    TestValidator.equals(
      "project 2 actual hours",
      project2Entry.actual_hours,
      1,
    ); // 60 minutes / 60 = 1 hour
    TestValidator.equals(
      "project 2 utilization",
      project2Entry.utilization_percentage,
      (1 / 200) * 100,
    );
  }
  // 9. Validate all entries have required fields
  for (const entry of report.data) {
    TestValidator.predicate("entry has valid id", entry.id !== undefined);
    TestValidator.predicate("entry has name", entry.name !== undefined);
    TestValidator.predicate("entry has color", entry.color !== undefined);
    TestValidator.predicate(
      "entry has valid status",
      ["active", "archived", "completed"].includes(entry.status),
    );
    TestValidator.predicate(
      "entry has budget hours",
      entry.budget_hours !== undefined,
    );
    TestValidator.predicate(
      "entry has actual hours",
      entry.actual_hours !== undefined,
    );
    TestValidator.predicate(
      "entry has utilization percentage",
      entry.utilization_percentage !== undefined,
    );
    TestValidator.predicate(
      "utilization is non-negative",
      entry.utilization_percentage >= 0,
    );
  }
}