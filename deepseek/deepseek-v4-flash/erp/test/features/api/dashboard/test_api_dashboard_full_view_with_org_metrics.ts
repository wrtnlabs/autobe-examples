import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timers_start } from "../../../generate/generate_random_hrm_time_tracking_member_timers_start";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_dashboard_full_view_with_org_metrics(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Register a new member (Owner) using the authorize utility
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization — member becomes Owner with all permissions
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project with budget hours
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(project);
  // 4. Retrieve the employee record from the organization's employee list
  const employeeId = authorized.employees.find(
    (emp) => emp.member.id === authorized.id,
  )?.id;
  if (employeeId === undefined) throw new Error("Employee not found");
  // 5. Add the employee as a project member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeId,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create a task assigned to the employee
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeId,
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(task);
  // 7. Log time today
  const today = new Date().toISOString();
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: today,
          project_id: project.id,
          task_id: task.id,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
          >(),
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  // 8. Start a running timer
  const timer = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // 9. Create a draft timesheet for the current week
  // Calculate the Monday of the current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const weekStartDate = monday.toISOString().split("T")[0];
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // ---- Execute: Fetch Dashboard ----
  const dashboard =
    await api.functional.hrmTimeTracking.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // ---- Validate Personal Dashboard Fields ----
  TestValidator.predicate("today_hours > 0", () => dashboard.today_hours > 0);
  TestValidator.predicate(
    "week_hours >= today_hours",
    () => dashboard.week_hours >= dashboard.today_hours,
  );
  // Active timer
  TestValidator.predicate(
    "active_timer is present and running",
    () =>
      dashboard.active_timer !== null &&
      dashboard.active_timer.status === "running",
  );
  // Recent timelogs — at least the one we created
  TestValidator.predicate(
    "recent_timelogs contains at least one entry",
    () => dashboard.recent_timelogs.length >= 1,
  );
  // Pending timesheet — must exist with draft status
  TestValidator.predicate(
    "pending_timesheet exists with draft status",
    () =>
      dashboard.pending_timesheet !== null &&
      dashboard.pending_timesheet.status === "draft" &&
      dashboard.pending_timesheet.total_hours > 0,
  );
  // Assigned tasks — must contain our task
  TestValidator.predicate("assigned_tasks contains the created task", () =>
    dashboard.assigned_tasks.some((t) => t.id === task.id),
  );
  // ---- Validate Organization Dashboard Fields ----
  // As Owner, the organization section must be present
  TestValidator.predicate(
    "organization section is present (Owner has report:view)",
    () => dashboard.organization !== undefined,
  );
  typia.assertGuard(dashboard.organization!);
  TestValidator.predicate(
    "total_active_employees >= 1",
    () => dashboard.organization!.total_active_employees >= 1,
  );
  TestValidator.predicate(
    "total_week_hours > 0",
    () => dashboard.organization!.total_week_hours > 0,
  );
  TestValidator.predicate(
    "pending_timesheet_count >= 0",
    () => dashboard.organization!.pending_timesheet_count >= 0,
  );
  TestValidator.predicate("budget_alerts is an array", () =>
    Array.isArray(dashboard.organization!.budget_alerts),
  );
  TestValidator.predicate(
    "top_employees contains at least one entry",
    () => dashboard.organization!.top_employees.length >= 1,
  );
}
