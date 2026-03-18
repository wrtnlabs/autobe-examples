import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { generate_random_hrms_member_timer_start_create } from "../../../generate/generate_random_hrms_member_timer_start_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_member_dashboard_personal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account and join organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Join existing organization with employee role
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const organizationMembers =
    await api.functional.hrms.member.organization_members.create(
      memberConnection,
      {
        body: {
          hrms_member_id: authorized.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMembers);
  // 3. Create employee record
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employee =
    await api.functional.hrms.member.organizations.employees.update(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          display_name: RandomGenerator.name(),
          position: RandomGenerator.name(),
          employment_type: "full-time",
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employee);
  // 4. Create project UUID for tasks and timelogs
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Create assigned tasks in open/in-progress status
  const taskIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    taskIds.push(typia.random<string & tags.Format<"uuid">>());
  }
  const tasks = await ArrayUtil.asyncMap(taskIds, async (taskId) =>
    api.functional.hrms.member.projects.tasks.create(memberConnection, {
      projectId,
      body: {
        title: RandomGenerator.name(2),
        status: RandomGenerator.pick(["open" as const, "in-progress" as const]),
        hrms_employee_id: employeeId,
      } satisfies IHrmsTask.ICreate,
    }),
  );
  tasks.forEach((task) => typia.assert(task));
  // 6. Create timelogs for today and current week
  // Timelog for today
  const todayTimelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: new Date().toISOString(),
          duration_minutes: 60,
          project_id: projectId,
          billable: true,
          description: "Work today",
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(todayTimelog);
  // Timelog for this week (Monday)
  const weekStart = new Date();
  const weekStartDay = weekStart.getDay();
  const monday = new Date(weekStart);
  monday.setDate(
    weekStart.getDate() - (weekStartDay === 0 ? 6 : weekStartDay - 1),
  );
  monday.setHours(0, 0, 0, 0);
  const weekTimelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: monday.toISOString(),
          duration_minutes: 120,
          project_id: projectId,
          billable: false,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(weekTimelog);
  // 7. Start active timer
  const timer = await api.functional.hrms.member.timer.start.create(
    memberConnection,
    {
      body: {
        project_id: projectId,
        task_id: taskIds[0],
        description: "Working now",
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 8. Create submitted timesheet for current week
  const weekStartIso = monday.toISOString().split("T")[0] + "T00:00:00+09:00";
  const timesheet = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartIso,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 9. Call dashboard endpoint
  const dashboard =
    await api.functional.hrms.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 10. Validate dashboard response
  TestValidator.equals("dashboard_type", dashboard.dashboard_type, "personal");
  TestValidator.equals("hours_today", dashboard.hours_today, 1);
  TestValidator.equals("hours_this_week", dashboard.hours_this_week, 3);
  TestValidator.equals(
    "active_timer exists",
    dashboard.active_timer !== null,
    true,
  );
  TestValidator.equals(
    "pending_timesheets_count",
    dashboard.pending_timesheets_count,
    1,
  );
  TestValidator.equals(
    "assigned_tasks count",
    dashboard.assigned_tasks?.length,
    2,
  );
}
