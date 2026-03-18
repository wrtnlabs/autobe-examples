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

export async function test_api_project_budget_report_excludes_no_budget_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create project WITH budget hours
  const projectWithBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: "#FF5733",
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithBudget);
  // 3. Create project WITHOUT budget hours (null)
  const projectWithoutBudget =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: "#33FF57",
          budget_hours: null,
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectWithoutBudget);
  // 4. Create timelog entries for BOTH projects
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectWithBudget.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectWithoutBudget.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // 5. Query the budget report endpoint
  const report =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report);
  // 6. Verify only project with budget_hours appears in results
  const projectIds = report.data.map((item) => item.id);
  // Project with budget should be included
  TestValidator.equals(
    "project with budget hours included in report",
    projectIds.includes(projectWithBudget.id),
    true,
  );
  // Project without budget should be excluded
  TestValidator.equals(
    "project without budget hours excluded from report",
    projectIds.includes(projectWithoutBudget.id),
    false,
  );
  // Verify the included project has valid budget metrics
  const budgetReportItem = report.data.find(
    (item) => item.id === projectWithBudget.id,
  );
  TestValidator.predicate(
    "budget report item exists for project with budget",
    budgetReportItem !== undefined,
  );
  if (budgetReportItem) {
    TestValidator.predicate(
      "budget percentage is calculated",
      budgetReportItem.budget_percentage >= 0,
    );
    TestValidator.predicate(
      "total hours is calculated",
      budgetReportItem.total_hours > 0,
    );
  }
}
