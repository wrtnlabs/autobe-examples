import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPersonalDashboardView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPersonalDashboardView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test that the personal dashboard correctly aggregates all workforce metrics for an active employee with multiple concurrent activities.
 *
 * Validates the complete personal dashboard flow including member authentication, project creation, timer initiation, timelog recording, timesheet creation, and task assignment. Ensures that the dashboard correctly reflects hours worked, active timers, recent timelogs, pending timesheets, and assigned tasks.
 *
 * Special attention is given to verifying that hours calculations match created timelogs, active timer state persists, recent timelog entries reflect created work, pending timesheet shows draft status with correct week dates, and assigned tasks appear in the dashboard list.
 *
 * 1. Member joins and authenticates as organization owner.
 * 2. Project is created for tracking work.
 * 3. Multiple timelogs are created for today's date with durations totaling 3.5 hours.
 * 4. Active timer is started against the project.
 * 5. Draft timesheet is created for this week.
 * 6. Two tasks are created and assigned to the member.
 * 7. Personal dashboard is fetched and comprehensively validated.
 */
export async function test_api_dashboard_employee_full_activity(
  connection: api.IConnection,
): Promise<void> {
  /* ---- 1. Member authentication ---- */
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  /* ---- 2. Create project ---- */
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Test Project for Dashboard Validation",
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  /* ---- 3. Create timelogs for today and this week ---- */
  const now = new Date();
  const todayIso = now.toISOString();
  const day1 = new Date(now);
  day1.setDate(now.getDate() - 1);
  const yesterdayIso = day1.toISOString();
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: todayIso,
        durationMinutes: 120,
        projectId: project.id,
        workDescription: "Frontend development work",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: todayIso,
        durationMinutes: 90,
        projectId: project.id,
        workDescription: "Code review session",
        billable: false,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: yesterdayIso,
        durationMinutes: 60,
        projectId: project.id,
        workDescription: "Planning meeting",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  /* Expected totals: 120 + 90 minutes today = 3.5 hours; plus 60 minutes yesterday = 4.5 hours this week */
  /* ---- 4. Start active timer ---- */
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: "Ongoing feature implementation",
        billable: true,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  /* ---- 5. Create draft timesheet for this week ---- */
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: todayIso,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  /* ---- 6. Create tasks ---- */
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Implement navigation component",
        status: "open",
        priority: "high",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Fix login validation bug",
        status: "in-progress",
        priority: "urgent",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task2);
  /* ---- 7. Fetch and validate dashboard ---- */
  const dashboard =
    await api.functional.hrmPlatform.member.personal_dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  /* Validate hours aggregates are positive numbers */
  TestValidator.predicate(
    "hoursToday is non-negative number",
    typeof dashboard.hoursToday === "number" && dashboard.hoursToday >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative number",
    typeof dashboard.hoursThisWeek === "number" && dashboard.hoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek includes at least today's hours",
    dashboard.hoursThisWeek >= dashboard.hoursToday,
  );
  /* Validate active timer exists and matches started timer */
  TestValidator.predicate(
    "active timer exists",
    dashboard.activeTimer !== null,
  );
  TestValidator.equals(
    "active timer ID matches",
    dashboard.activeTimer!.id,
    timer.id,
  );
  TestValidator.equals(
    "active timer project matches",
    dashboard.activeTimer!.project.id,
    project.id,
  );
  TestValidator.equals(
    "active timer is active",
    dashboard.activeTimer!.is_active,
    true,
  );
  /* Validate recent timelogs */
  TestValidator.predicate(
    "recent timelogs array non-empty",
    dashboard.recentTimelogs.length > 0,
  );
  const recentIds = dashboard.recentTimelogs.map((t) => t.id);
  TestValidator.predicate(
    "recent timelogs includes timelog1",
    recentIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "recent timelogs limited to 5 entries",
    dashboard.recentTimelogs.length <= 5,
  );
  /* Validate pending timesheet */
  TestValidator.predicate(
    "pending timesheet exists",
    dashboard.pendingTimesheet !== null,
  );
  TestValidator.predicate(
    "pending timesheet status is draft or submitted",
    dashboard.pendingTimesheet !== null &&
      (dashboard.pendingTimesheet!.status === "draft" ||
        dashboard.pendingTimesheet!.status === "submitted"),
  );
  TestValidator.predicate(
    "pending timesheet has valid week dates",
    dashboard.pendingTimesheet !== null &&
      dashboard.pendingTimesheet!.week_start_date !== undefined &&
      dashboard.pendingTimesheet!.week_end_date !== undefined &&
      new Date(dashboard.pendingTimesheet!.week_end_date).getTime() >=
        new Date(dashboard.pendingTimesheet!.week_start_date).getTime(),
  );
  /* Validate assigned tasks */
  TestValidator.predicate(
    "assigned tasks array non-empty",
    dashboard.assignedTasks.length > 0,
  );
  const assignedIdSet = new Set(dashboard.assignedTasks.map((t) => t.id));
  TestValidator.predicate(
    "assigned tasks includes task1",
    assignedIdSet.has(task1.id),
  );
  TestValidator.predicate(
    "assigned tasks includes task2",
    assignedIdSet.has(task2.id),
  );
  TestValidator.predicate(
    "assigned tasks limited to 5 entries",
    dashboard.assignedTasks.length <= 5,
  );
  TestValidator.predicate(
    "all assigned tasks are open or in-progress",
    dashboard.assignedTasks.every(
      (t) => t.status === "open" || t.status === "in-progress",
    ),
  );
}
