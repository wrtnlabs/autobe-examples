import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_admin_timers_create } from "../../../generate/generate_random_hrm_platform_admin_timers_create";
import { generate_random_hrm_platform_admin_timesheets_create } from "../../../generate/generate_random_hrm_platform_admin_timesheets_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_employee_workload_with_comprehensive_data(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test comprehensive employee workload statistics retrieval with rich activity data.
   * This test creates a complete employee workflow with timelogs, timers, tasks, and timesheets
   * to validate that the workload endpoint correctly aggregates all statistics.
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@workload-test.com",
      password: "AdminPass123!",
      href: "https://hrm.example.com/admin/login",
      referrer: "https://hrm.example.com/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member authentication (employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "employee@workload-test.com",
      password: "EmployeePass123!",
      href: "https://hrm.example.com/member/join",
      referrer: "https://hrm.example.com/member",
    },
  });
  typia.assert(memberAuth);
  // 3. Create employee invitation (admin invites member)
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: "employee@workload-test.com",
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Create a project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Workload Test Project",
        description: "Project for comprehensive workload testing",
        status: "active",
        color_code: "#3498db",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 5. Create tasks within the project
  const task1 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task 1 - In Progress",
        description: "First task for workload testing",
        status: "in-progress",
        priority: "high",
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task 2 - Open",
        description: "Second task for workload testing",
        status: "open",
        priority: "medium",
        estimated_hours: 4,
      },
    },
  );
  typia.assert(task2);
  // 6. Create multiple timelogs across different time periods
  const now = new Date();
  const thisWeekMonday = new Date(now);
  thisWeekMonday.setDate(now.getDate() - now.getDay() + 1);
  thisWeekMonday.setHours(0, 0, 0, 0);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);
  // Timelog 1: This week (billable)
  const timelog1 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        task_id: task1.id,
        date: thisWeekMonday.toISOString(),
        duration: 480,
        billable: true,
        description: "Work on task 1 this week",
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: This week (non-billable)
  const timelog2 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        task_id: task2.id,
        date: new Date(
          thisWeekMonday.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        duration: 240,
        billable: false,
        description: "Internal work this week",
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: Earlier this month (billable)
  const timelog3 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        task_id: task1.id,
        date: new Date(
          thisMonthStart.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        duration: 360,
        billable: true,
        description: "Work earlier this month",
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: Last month (billable)
  const timelog4 = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        task_id: task2.id,
        date: new Date(
          lastMonthStart.getTime() + 15 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        duration: 420,
        billable: true,
        description: "Work last month",
      },
    },
  );
  typia.assert(timelog4);
  // 7. Start an active timer for the employee
  const timer = await generate_random_hrm_platform_admin_timers_create(
    adminConnection,
    {
      body: {
        projectId: project.id,
        taskId: task1.id,
        description: "Active timer for workload test",
      },
    },
  );
  typia.assert(timer);
  // 8. Create a timesheet for this week
  const timesheet = await generate_random_hrm_platform_admin_timesheets_create(
    adminConnection,
    {
      body: {
        week_start_date: thisWeekMonday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 9. Use member ID as employee ID
  const employeeId = memberAuth.id;
  // 10. Call workload endpoint
  const workload = await api.functional.hrmPlatform.admin.employees.workload(
    adminConnection,
    {
      employeeId: employeeId,
    },
  );
  typia.assert(workload);
  // 11. Validate workload statistics
  TestValidator.predicate("hoursThisWeek > 0", workload.hoursThisWeek > 0);
  TestValidator.predicate(
    "hoursThisMonth > hoursThisWeek",
    workload.hoursThisMonth > workload.hoursThisWeek,
  );
  TestValidator.predicate(
    "hoursAllTime > hoursThisMonth",
    workload.hoursAllTime > workload.hoursThisMonth,
  );
  TestValidator.predicate("activeTimer is true", workload.activeTimer);
  TestValidator.equals(
    "activeTimerProjectId matches",
    workload.activeTimerProjectId,
    project.id,
  );
  TestValidator.equals(
    "activeTimerTaskId matches",
    workload.activeTimerTaskId,
    task1.id,
  );
  TestValidator.predicate(
    "activeTimerStartedAt is valid",
    workload.activeTimerStartedAt !== null,
  );
  TestValidator.equals(
    "assignedTasksCount is 2",
    workload.assignedTasksCount,
    2,
  );
  TestValidator.predicate(
    "pendingTimesheetsCount >= 0",
    workload.pendingTimesheetsCount >= 0,
  );
  TestValidator.predicate("billableHours > 0", workload.billableHours > 0);
  TestValidator.predicate(
    "nonBillableHours > 0",
    workload.nonBillableHours > 0,
  );
  TestValidator.predicate(
    "billable + nonBillable ≈ allTime",
    Math.abs(
      workload.billableHours +
        workload.nonBillableHours -
        workload.hoursAllTime,
    ) < 0.01,
  );
  TestValidator.predicate(
    "hoursByProject has entries",
    workload.hoursByProject.length > 0,
  );
  TestValidator.predicate(
    "hoursByProject contains test project",
    workload.hoursByProject.some((p) => p.projectId === project.id),
  );
  const projectHours = workload.hoursByProject.find(
    (p) => p.projectId === project.id,
  );
  TestValidator.predicate(
    "project hours > 0",
    (projectHours?.hoursLogged ?? 0) > 0,
  );
}