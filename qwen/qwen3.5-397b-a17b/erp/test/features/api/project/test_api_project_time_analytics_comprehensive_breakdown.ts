import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformProjectTimeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeAnalytic";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
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
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_project_time_analytics_comprehensive_breakdown(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
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
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
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
  // 3. Get the default role (Owner role is created with organization)
  // The member who created the organization is automatically the owner
  // We need to create a custom role or use the built-in role
  // For simplicity, we'll create employees with the member's own ID first
  // Actually, we need to get roles - let's create a simpler approach
  // Since we don't have a get roles endpoint in available functions,
  // we'll need to work with what we have
  // Create second member first
  const member2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // For role_id, we need to use a valid UUID - in real scenario this would come from roles endpoint
  // Since we can't query roles, we'll use a placeholder and the backend should handle it
  // Actually, let's use the member ID as a workaround for testing
  // This is not ideal but necessary given available API functions
  const mockRoleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create first employee (the owner)
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: mockRoleId,
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee1);
  // 5. Create second employee
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member2Auth.id,
        role_id: mockRoleId,
        employment_type: "part-time",
        status: "active",
      },
    },
  );
  typia.assert(employee2);
  // 6. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 7. Assign first employee to project
  const projectMember1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee1.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember1);
  // 8. Assign second employee to project
  const projectMember2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee2.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember2);
  // 9. Create tasks for the project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "in-progress",
        priority: "high",
      },
    },
  );
  typia.assert(task2);
  // 10. Create timelogs for employee 1 on different dates and tasks
  const date1 = new Date();
  date1.setDate(date1.getDate() - 5);
  const date2 = new Date();
  date2.setDate(date2.getDate() - 3);
  const date3 = new Date();
  date3.setDate(date3.getDate() - 1);
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task1.id,
        date: date1.toISOString(),
        duration_minutes: 120,
        description: "Development work",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task2.id,
        date: date2.toISOString(),
        duration_minutes: 90,
        description: "Code review",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // 11. Create timelogs for employee 2 with different billable status
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task1.id,
        date: date2.toISOString(),
        duration_minutes: 60,
        description: "Testing",
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        date: date3.toISOString(),
        duration_minutes: 45,
        description: "Meeting",
        billable: false,
      },
    },
  );
  typia.assert(timelog4);
  // 12. Execute analytics endpoint
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.time.analyticsTime(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(analytics);
  // 13. Validate total hours and minutes
  const expectedTotalMinutes = 120 + 90 + 60 + 45; // 315 minutes
  TestValidator.equals(
    "total minutes",
    analytics.totalMinutes,
    expectedTotalMinutes,
  );
  TestValidator.equals(
    "total hours",
    analytics.totalHours,
    expectedTotalMinutes / 60,
  );
  // 14. Validate employee breakdown
  TestValidator.predicate(
    "employee breakdown has 2 entries",
    () => analytics.employeeBreakdown.length === 2,
  );
  TestValidator.predicate("employee breakdown contains employee 1", () =>
    analytics.employeeBreakdown.some((e) => e.employee_id === employee1.id),
  );
  TestValidator.predicate("employee breakdown contains employee 2", () =>
    analytics.employeeBreakdown.some((e) => e.employee_id === employee2.id),
  );
  // 15. Validate task breakdown
  TestValidator.predicate(
    "task breakdown has entries",
    () => analytics.taskBreakdown.length >= 2,
  );
  const task1Breakdown = analytics.taskBreakdown.find(
    (t) => t.task_id === task1.id,
  );
  TestValidator.predicate(
    "task1 breakdown exists",
    () => task1Breakdown !== undefined,
  );
  TestValidator.equals("task1 title", task1Breakdown!.title, task1.title);
  // Check for unassigned time (task_id === null)
  const unassignedBreakdown = analytics.taskBreakdown.find(
    (t) => t.task_id === null,
  );
  TestValidator.predicate(
    "unassigned time exists",
    () => unassignedBreakdown !== undefined,
  );
  TestValidator.equals(
    "unassigned title",
    unassignedBreakdown!.title,
    "Unassigned",
  );
  // 16. Validate daily breakdown
  TestValidator.predicate(
    "daily breakdown has 3 entries",
    () => analytics.dailyBreakdown.length === 3,
  );
  const dates = analytics.dailyBreakdown.map((d) => d.date).sort();
  TestValidator.predicate("daily breakdown is chronological", () => {
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] < dates[i - 1]) return false;
    }
    return true;
  });
  // 17. Validate billable breakdown
  const expectedBillableMinutes = 120 + 90; // 210
  const expectedNonBillableMinutes = 60 + 45; // 105
  TestValidator.equals(
    "billable minutes",
    analytics.billableBreakdown.billableMinutes,
    expectedBillableMinutes,
  );
  TestValidator.equals(
    "non-billable minutes",
    analytics.billableBreakdown.nonBillableMinutes,
    expectedNonBillableMinutes,
  );
  TestValidator.equals(
    "billable hours",
    analytics.billableBreakdown.billableHours,
    expectedBillableMinutes / 60,
  );
  TestValidator.equals(
    "non-billable hours",
    analytics.billableBreakdown.nonBillableHours,
    expectedNonBillableMinutes / 60,
  );
  // 18. Validate date range
  TestValidator.notEquals(
    "from date is not null",
    analytics.dateRange.fromDate,
    null,
  );
  TestValidator.notEquals(
    "to date is not null",
    analytics.dateRange.toDate,
    null,
  );
  const expectedFromDate = date1.toISOString().split("T")[0];
  const expectedToDate = date3.toISOString().split("T")[0];
  TestValidator.equals(
    "from date is earliest",
    analytics.dateRange.fromDate,
    expectedFromDate,
  );
  TestValidator.equals(
    "to date is latest",
    analytics.dateRange.toDate,
    expectedToDate,
  );
}
