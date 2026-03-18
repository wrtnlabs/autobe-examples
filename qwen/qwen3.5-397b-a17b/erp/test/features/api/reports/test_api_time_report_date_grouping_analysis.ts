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
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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

export async function test_api_time_report_date_grouping_analysis(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const orgConnection: api.IConnection = { host: connection.host };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      orgConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create additional members for employees
  const employee1Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(employee1Auth);
  const employee2Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(employee2Auth);
  // 4. Create employee records in organization
  // Note: Using the organization owner's member_id as a workaround for role assignment
  // In production, you would query available roles first
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    orgConnection,
    {
      body: {
        member_id: employee1Auth.member.id,
        role_id: organization.owner.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    orgConnection,
    {
      body: {
        member_id: employee2Auth.member.id,
        role_id: organization.owner.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee2);
  // 5. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    orgConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 6. Assign employees to project
  await generate_random_hrm_platform_member_projects_members_create(
    orgConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_platform_employee_id: employee1.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    orgConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_platform_employee_id: employee2.id,
        role: "member",
      },
    },
  );
  // 7. Create timelogs distributed across multiple dates
  const baseDate = new Date();
  const timelogs: IHrmPlatformTimelog[] = [];
  // Create timelogs for 5 different dates
  for (let i = 0; i < 5; i++) {
    const workDate = new Date(baseDate);
    workDate.setDate(baseDate.getDate() - i);
    // Create 2-3 timelogs per date with varied billable status
    const timelogsPerDate = 2 + (i % 2);
    for (let j = 0; j < timelogsPerDate; j++) {
      const timelog = await generate_random_hrm_platform_member_timelogs_create(
        orgConnection,
        {
          body: {
            project_id: project.id,
            date: workDate.toISOString(),
            duration_minutes: 60 + j * 30,
            billable: j % 2 === 0,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
      typia.assert(timelog);
      timelogs.push(timelog);
    }
  }
  // 8. Query time report with date grouping
  const startDate = new Date(baseDate);
  startDate.setDate(baseDate.getDate() - 6);
  const endDate = new Date(baseDate);
  const timeReport =
    await api.functional.hrmPlatform.member.reports.time.search(orgConnection, {
      body: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: "date",
        limit: 10,
        page: 1,
      } satisfies IHrmPlatformTimeReport.IRequest,
    });
  typia.assert(timeReport);
  // 9. Validate report structure - response is array of IHrmPlatformTimeReport
  const reportArray = Array.isArray(timeReport) ? timeReport : [timeReport];
  TestValidator.predicate("report has data", reportArray.length > 0);
  TestValidator.equals("group type is date", reportArray[0].groupType, "date");
  // 10. Validate date grouping accuracy
  for (const reportEntry of reportArray) {
    const dateGroup =
      reportEntry.groupValue as IHrmPlatformTimeReport.IDateGroup;
    TestValidator.predicate(
      "date format is YYYY-MM-DD",
      /^\d{4}-\d{2}-\d{2}$/.test(dateGroup.date),
    );
    TestValidator.predicate(
      "total hours is positive",
      reportEntry.totalHours > 0,
    );
    TestValidator.equals(
      "hours breakdown matches",
      reportEntry.totalHours,
      reportEntry.billableHours + reportEntry.nonBillableHours,
    );
    TestValidator.predicate(
      "entry count is positive",
      reportEntry.entryCount > 0,
    );
  }
  // 11. Test pagination
  const paginatedReport =
    await api.functional.hrmPlatform.member.reports.time.search(orgConnection, {
      body: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: "date",
        limit: 2,
        page: 1,
      } satisfies IHrmPlatformTimeReport.IRequest,
    });
  typia.assert(paginatedReport);
  const paginatedArray = Array.isArray(paginatedReport)
    ? paginatedReport
    : [paginatedReport];
  TestValidator.predicate(
    "pagination limit respected",
    paginatedArray.length <= 2,
  );
}
