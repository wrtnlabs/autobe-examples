import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEHrmPlatformProjectStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEHrmPlatformProjectStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_budget_report_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee (member becomes employee in their own org)
  // Note: role_id must reference a valid role in the organization
  // Using generated UUID - in production this would come from role query
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: roleId,
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project with budget hours
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#FF5733",
        budget_hours: 100,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create timelogs on different dates
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  // Timelog from 2 weeks ago (60 minutes = 1 hour)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: twoWeeksAgo.toISOString(),
        duration_minutes: 60,
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // Timelog from 1 week ago (120 minutes = 2 hours)
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: oneWeekAgo.toISOString(),
        duration_minutes: 120,
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Timelog from 3 days ago (180 minutes = 3 hours)
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: threeDaysAgo.toISOString(),
        duration_minutes: 180,
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // Total expected: 6 hours (360 minutes)
  // 7. First call: No date filters - should include all timelogs (6 hours)
  const reportAll =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportAll);
  const projectReportAll = reportAll.data.find((p) => p.id === project.id);
  TestValidator.predicate(
    "project found in report",
    projectReportAll !== undefined,
  );
  if (projectReportAll) {
    TestValidator.predicate(
      "all timelogs included (6 hours)",
      projectReportAll.actual_hours >= 5.9 &&
        projectReportAll.actual_hours <= 6.1,
    );
    TestValidator.predicate(
      "utilization calculated (6%)",
      projectReportAll.utilization_percentage !== null &&
        projectReportAll.utilization_percentage >= 5 &&
        projectReportAll.utilization_percentage <= 7,
    );
  }
  // 8. Second call: dateFrom = 1 week ago - should include timelogs from 1 week ago and 3 days ago (5 hours)
  const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];
  const reportFromOneWeek =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          dateFrom: oneWeekAgoStr,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportFromOneWeek);
  const projectReportFromOneWeek = reportFromOneWeek.data.find(
    (p) => p.id === project.id,
  );
  TestValidator.predicate(
    "project found in filtered report",
    projectReportFromOneWeek !== undefined,
  );
  if (projectReportFromOneWeek && projectReportAll) {
    TestValidator.predicate(
      "filtered timelogs included (5 hours)",
      projectReportFromOneWeek.actual_hours >= 4.9 &&
        projectReportFromOneWeek.actual_hours <= 5.1,
    );
    TestValidator.notEquals(
      "utilization differs from unfiltered",
      projectReportFromOneWeek.utilization_percentage,
      projectReportAll.utilization_percentage,
    );
  }
  // 9. Third call: dateFrom and dateTo narrow window (3 days ago only, 3 hours)
  const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];
  const nowStr = now.toISOString().split("T")[0];
  const reportNarrowWindow =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          dateFrom: threeDaysAgoStr,
          dateTo: nowStr,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportNarrowWindow);
  const projectReportNarrow = reportNarrowWindow.data.find(
    (p) => p.id === project.id,
  );
  TestValidator.predicate(
    "project found in narrow window report",
    projectReportNarrow !== undefined,
  );
  if (projectReportNarrow && projectReportFromOneWeek) {
    TestValidator.predicate(
      "narrow window timelogs included (3 hours)",
      projectReportNarrow.actual_hours >= 2.9 &&
        projectReportNarrow.actual_hours <= 3.1,
    );
    TestValidator.notEquals(
      "utilization differs from wider window",
      projectReportNarrow.utilization_percentage,
      projectReportFromOneWeek.utilization_percentage,
    );
  }
}
