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

export async function test_api_time_report_project_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create two employees for timelog entries
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "part-time",
        status: "active",
      },
    },
  );
  typia.assert(employee2);
  // 4. Create two projects for grouping validation
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Billable Project Alpha",
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Non-Billable Project Beta",
        color_code: "#33FF57",
        status: "active",
      },
    },
  );
  typia.assert(project2);
  // 5. Assign employees to projects
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        hrm_platform_employee_id: employee1.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        hrm_platform_employee_id: employee2.id,
        role: "project-lead",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        hrm_platform_employee_id: employee1.id,
        role: "member",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        hrm_platform_employee_id: employee2.id,
        role: "member",
      },
    },
  );
  // 6. Create timelogs with mixed billable status
  // Use dates within current week for consistent testing
  const now = new Date();
  const testDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    10,
    0,
    0,
  );
  const testDateString = testDate.toISOString();
  // Project 1: 2 billable timelogs (60 min + 90 min = 150 min = 2.5 hours)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: testDateString,
        duration_minutes: 60,
        billable: true,
        description: "Billable work on project 1",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: testDateString,
        duration_minutes: 90,
        billable: true,
        description: "More billable work on project 1",
      },
    },
  );
  typia.assert(timelog2);
  // Project 1: 1 non-billable timelog (30 min)
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: testDateString,
        duration_minutes: 30,
        billable: false,
        description: "Non-billable admin work",
      },
    },
  );
  typia.assert(timelog3);
  // Project 2: 1 billable timelog (45 min)
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: testDateString,
        duration_minutes: 45,
        billable: true,
        description: "Billable work on project 2",
      },
    },
  );
  typia.assert(timelog4);
  // Project 2: 2 non-billable timelogs (20 min + 40 min = 60 min = 1 hour)
  const timelog5 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: testDateString,
        duration_minutes: 20,
        billable: false,
        description: "Non-billable meeting",
      },
    },
  );
  typia.assert(timelog5);
  const timelog6 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: testDateString,
        duration_minutes: 40,
        billable: false,
        description: "Non-billable training",
      },
    },
  );
  typia.assert(timelog6);
  // 7. Query time report with billable=true filter
  const billableReport = typia.assert<IHrmPlatformTimeReport[]>(
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          groupBy: "project",
          billable: true,
          startDate: testDateString,
          endDate: testDateString,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    ),
  );
  // 8. Validate billable report results
  TestValidator.predicate(
    "billable report has data",
    () => billableReport.length > 0,
  );
  // Filter reports for each project
  const project1BillableReport = billableReport.find(
    (r: IHrmPlatformTimeReport) =>
      r.groupType === "project" &&
      (r.groupValue as IHrmPlatformProject.ISummary).id === project1.id,
  );
  const project2BillableReport = billableReport.find(
    (r: IHrmPlatformTimeReport) =>
      r.groupType === "project" &&
      (r.groupValue as IHrmPlatformProject.ISummary).id === project2.id,
  );
  // Validate project 1 billable report
  TestValidator.predicate(
    "project 1 billable report exists",
    () => project1BillableReport !== undefined,
  );
  if (project1BillableReport) {
    TestValidator.equals(
      "project 1 total hours",
      project1BillableReport.totalHours,
      2.5,
    ); // 150 min / 60
    TestValidator.equals(
      "project 1 billable hours",
      project1BillableReport.billableHours,
      2.5,
    );
    TestValidator.equals(
      "project 1 non-billable hours",
      project1BillableReport.nonBillableHours,
      0,
    );
    TestValidator.equals(
      "project 1 entry count",
      project1BillableReport.entryCount,
      2,
    );
    TestValidator.equals(
      "project 1 group type",
      project1BillableReport.groupType,
      "project",
    );
    const project1Value =
      project1BillableReport.groupValue as IHrmPlatformProject.ISummary;
    TestValidator.equals("project 1 id matches", project1Value.id, project1.id);
    TestValidator.equals(
      "project 1 name matches",
      project1Value.name,
      project1.name,
    );
    TestValidator.equals(
      "project 1 color matches",
      project1Value.color_code,
      project1.color_code,
    );
    TestValidator.equals(
      "project 1 status matches",
      project1Value.status,
      "active",
    );
  }
  // Validate project 2 billable report
  TestValidator.predicate(
    "project 2 billable report exists",
    () => project2BillableReport !== undefined,
  );
  if (project2BillableReport) {
    TestValidator.equals(
      "project 2 total hours",
      project2BillableReport.totalHours,
      0.75,
    ); // 45 min / 60
    TestValidator.equals(
      "project 2 billable hours",
      project2BillableReport.billableHours,
      0.75,
    );
    TestValidator.equals(
      "project 2 non-billable hours",
      project2BillableReport.nonBillableHours,
      0,
    );
    TestValidator.equals(
      "project 2 entry count",
      project2BillableReport.entryCount,
      1,
    );
    const project2Value =
      project2BillableReport.groupValue as IHrmPlatformProject.ISummary;
    TestValidator.equals("project 2 id matches", project2Value.id, project2.id);
  }
  // 9. Query time report with billable=false filter
  const nonBillableReport = typia.assert<IHrmPlatformTimeReport[]>(
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          groupBy: "project",
          billable: false,
          startDate: testDateString,
          endDate: testDateString,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    ),
  );
  // 10. Validate non-billable report results
  TestValidator.predicate(
    "non-billable report has data",
    () => nonBillableReport.length > 0,
  );
  const project1NonBillableReport = nonBillableReport.find(
    (r: IHrmPlatformTimeReport) =>
      r.groupType === "project" &&
      (r.groupValue as IHrmPlatformProject.ISummary).id === project1.id,
  );
  const project2NonBillableReport = nonBillableReport.find(
    (r: IHrmPlatformTimeReport) =>
      r.groupType === "project" &&
      (r.groupValue as IHrmPlatformProject.ISummary).id === project2.id,
  );
  // Validate project 1 non-billable report
  TestValidator.predicate(
    "project 1 non-billable report exists",
    () => project1NonBillableReport !== undefined,
  );
  if (project1NonBillableReport) {
    TestValidator.equals(
      "project 1 non-billable total hours",
      project1NonBillableReport.totalHours,
      0.5,
    ); // 30 min / 60
    TestValidator.equals(
      "project 1 non-billable billable hours",
      project1NonBillableReport.billableHours,
      0,
    );
    TestValidator.equals(
      "project 1 non-billable non-billable hours",
      project1NonBillableReport.nonBillableHours,
      0.5,
    );
    TestValidator.equals(
      "project 1 non-billable entry count",
      project1NonBillableReport.entryCount,
      1,
    );
  }
  // Validate project 2 non-billable report
  TestValidator.predicate(
    "project 2 non-billable report exists",
    () => project2NonBillableReport !== undefined,
  );
  if (project2NonBillableReport) {
    TestValidator.equals(
      "project 2 non-billable total hours",
      project2NonBillableReport.totalHours,
      1,
    ); // 60 min / 60
    TestValidator.equals(
      "project 2 non-billable billable hours",
      project2NonBillableReport.billableHours,
      0,
    );
    TestValidator.equals(
      "project 2 non-billable non-billable hours",
      project2NonBillableReport.nonBillableHours,
      1,
    );
    TestValidator.equals(
      "project 2 non-billable entry count",
      project2NonBillableReport.entryCount,
      2,
    );
  }
  // 11. Validate complementary results (billable + non-billable = total for each project)
  if (project1BillableReport && project1NonBillableReport) {
    TestValidator.equals(
      "project 1 combined hours match",
      project1BillableReport.totalHours + project1NonBillableReport.totalHours,
      3,
    );
  }
  if (project2BillableReport && project2NonBillableReport) {
    TestValidator.equals(
      "project 2 combined hours match",
      project2BillableReport.totalHours + project2NonBillableReport.totalHours,
      1.75,
    );
  }
}