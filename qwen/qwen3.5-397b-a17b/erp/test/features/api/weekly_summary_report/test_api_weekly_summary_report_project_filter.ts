import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

export async function test_api_weekly_summary_report_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project for filtering test
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Query weekly summary with projectCode filter
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const weeklySummary =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          projectCode: project.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(weeklySummary);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    weeklySummary.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(weeklySummary.data));
  TestValidator.equals("current page", weeklySummary.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    weeklySummary.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    weeklySummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    weeklySummary.pagination.pages >= 0,
  );
  // 5. Validate weekly summary data structure and business logic
  if (weeklySummary.data.length > 0) {
    const firstWeek = weeklySummary.data[0];
    TestValidator.predicate(
      "totalHours is non-negative",
      firstWeek.totalHours >= 0,
    );
    TestValidator.predicate(
      "timelogCount is non-negative",
      firstWeek.timelogCount >= 0,
    );
    TestValidator.predicate(
      "employeeCount is non-negative",
      firstWeek.employeeCount >= 0,
    );
    // Verify week period is valid (weekEnd should be after weekStart)
    const weekStart = new Date(firstWeek.weekStart);
    const weekEnd = new Date(firstWeek.weekEnd);
    TestValidator.predicate(
      "weekEnd is after weekStart",
      weekEnd.getTime() > weekStart.getTime(),
    );
  }
}
