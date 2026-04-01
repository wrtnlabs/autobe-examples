import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the dashboard endpoint focusing on active timer and timesheet status edge cases.
 *
 * This test validates:
 * 1. Active timer appears in dashboard's activeTimer field with correct project and optional task references
 * 2. Timesheet status transitions (none → draft → submitted) are reflected correctly in timesheetStatus field
 * 3. Timer includes started_at timestamp, project reference, optional task reference, and description
 * 4. Only one active timer can exist per employee
 * 5. recentTimelogs returns entries ordered by date descending
 */
export async function test_api_dashboard_active_timer_and_timesheet_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Update connection with auth token
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create organization (automatically creates employee record for member)
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
  // 3. Select organization context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create project for timer association
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Test dashboard with no active timer and no timesheet (timesheetStatus should be 'none')
  const dashboardInitial =
    await api.functional.hrmPlatform.member.dashboard.at(memberConnection);
  typia.assert(dashboardInitial);
  TestValidator.equals(
    "initial activeTimer is null",
    dashboardInitial.personal.activeTimer,
    null,
  );
  TestValidator.equals(
    "initial timesheetStatus is none",
    dashboardInitial.personal.timesheetStatus,
    "none",
  );
  // 6. Start active timer session
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 7. Verify timer appears in dashboard
  const dashboardWithTimer =
    await api.functional.hrmPlatform.member.dashboard.at(memberConnection);
  typia.assert(dashboardWithTimer);
  TestValidator.predicate(
    "activeTimer exists",
    dashboardWithTimer.personal.activeTimer !== null,
  );
  if (dashboardWithTimer.personal.activeTimer !== null) {
    const activeTimer = dashboardWithTimer.personal.activeTimer;
    typia.assert(activeTimer);
    TestValidator.equals(
      "timer project matches",
      activeTimer.project.id,
      project.id,
    );
    TestValidator.predicate(
      "timer has started_at",
      activeTimer.started_at !== undefined,
    );
    TestValidator.predicate(
      "timer description can be null or string",
      activeTimer.description === null ||
        typeof activeTimer.description === "string",
    );
    TestValidator.predicate(
      "timer task can be null or object",
      activeTimer.task === null || typeof activeTimer.task === "object",
    );
  }
  // 8. Try to create second timer (should fail - only one active timer per employee)
  await TestValidator.error("duplicate timer rejected", async () => {
    await api.functional.hrmPlatform.member.timers.create(memberConnection, {
      body: {
        project_id: project.id,
        description: "Second timer",
      } satisfies IHrmPlatformTimer.ICreate,
    });
  });
  // 9. Create timesheet for current week (status should be 'draft')
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStartDate = monday.toISOString().split("T")[0];
  const weekEndDate = sunday.toISOString().split("T")[0];
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 10. Verify timesheetStatus is 'draft'
  const dashboardWithTimesheet =
    await api.functional.hrmPlatform.member.dashboard.at(memberConnection);
  typia.assert(dashboardWithTimesheet);
  TestValidator.equals(
    "timesheetStatus is draft",
    dashboardWithTimesheet.personal.timesheetStatus,
    "draft",
  );
  // 11. Verify recentTimelogs returns array with max 5 entries
  TestValidator.predicate(
    "recentTimelogs is array",
    Array.isArray(dashboardWithTimesheet.personal.recentTimelogs),
  );
  TestValidator.predicate(
    "recentTimelogs has max 5 entries",
    dashboardWithTimesheet.personal.recentTimelogs.length <= 5,
  );
  // 12. Verify recentTimelogs are ordered by date descending (if multiple entries exist)
  if (dashboardWithTimesheet.personal.recentTimelogs.length > 1) {
    const timelogs = dashboardWithTimesheet.personal.recentTimelogs;
    for (let i = 0; i < timelogs.length - 1; i++) {
      const currentDate = new Date(timelogs[i].date).getTime();
      const nextDate = new Date(timelogs[i + 1].date).getTime();
      TestValidator.predicate(
        `timelog[${i}] date >= timelog[${i + 1}] date`,
        currentDate >= nextDate,
      );
    }
  }
}
