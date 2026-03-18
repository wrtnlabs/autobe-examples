import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_personal_dashboard_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member signup and authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
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
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee record for the member
  // Note: role_id would need to be a valid role from the organization
  // For this test, we use a placeholder that the backend should resolve
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as project-lead (enables task creation)
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create timelogs - some for today, some earlier in the week
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const timelogToday1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: today.toISOString(),
          duration_minutes: 120,
          description: "Morning work session",
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogToday1);
  const timelogToday2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: today.toISOString(),
          duration_minutes: 90,
          description: "Afternoon work session",
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogToday2);
  const timelogEarlier =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: threeDaysAgo.toISOString(),
          duration_minutes: 180,
          description: "Earlier week work",
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogEarlier);
  // 7. Start active timer
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: "Current work session",
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 8. Create draft timesheet for current week
  // Calculate Monday of current week in Asia/Seoul timezone
  const weekStart = new Date(today);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(today.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 9. Create tasks assigned to employee with various statuses
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task one - open status",
        status: "open",
        priority: "high",
        hrm_platform_employee_id: employee.id,
        due_date: new Date(
          today.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task two - in-progress status",
        status: "in-progress",
        priority: "medium",
        hrm_platform_employee_id: employee.id,
        due_date: new Date(
          today.getTime() + 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task2);
  // 10. Call personal dashboard endpoint
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.personal.at(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // Validation: hoursToday should be (120 + 90) / 60 = 3.5 hours
  TestValidator.predicate("hoursToday calculation", () => {
    const expectedHours = (120 + 90) / 60;
    return Math.abs(dashboard.hoursToday - expectedHours) < 0.01;
  });
  // Validation: hoursThisWeek should include all three timelogs
  TestValidator.predicate("hoursThisWeek calculation", () => {
    const expectedHours = (120 + 90 + 180) / 60;
    return Math.abs(dashboard.hoursThisWeek - expectedHours) < 0.01;
  });
  // Validation: activeTimer should exist and match created timer
  TestValidator.predicate(
    "activeTimer exists",
    () => dashboard.activeTimer !== null,
  );
  TestValidator.equals(
    "activeTimer project",
    dashboard.activeTimer!.project.id,
    project.id,
  );
  TestValidator.predicate(
    "activeTimer has started_at",
    () => dashboard.activeTimer!.started_at !== null,
  );
  // Validation: recentTimelogs should contain the created timelogs
  TestValidator.predicate(
    "recentTimelogs has entries",
    () => dashboard.recentTimelogs.length >= 3,
  );
  TestValidator.predicate("recentTimelogs ordered by date", () => {
    for (let i = 1; i < dashboard.recentTimelogs.length; i++) {
      if (
        new Date(dashboard.recentTimelogs[i].date) >
        new Date(dashboard.recentTimelogs[i - 1].date)
      ) {
        return false;
      }
    }
    return true;
  });
  // Validation: pendingTimesheet should exist and be in draft status
  TestValidator.predicate(
    "pendingTimesheet exists",
    () => dashboard.pendingTimesheet !== null,
  );
  TestValidator.equals(
    "pendingTimesheet status",
    dashboard.pendingTimesheet!.status,
    "draft",
  );
  // Validation: assignedTasks should contain the created tasks
  TestValidator.predicate(
    "assignedTasks has entries",
    () => dashboard.assignedTasks.length >= 2,
  );
  TestValidator.predicate("assignedTasks includes open and in-progress", () => {
    const statuses = dashboard.assignedTasks.map((t) => t.status);
    return statuses.includes("open") && statuses.includes("in-progress");
  });
}
