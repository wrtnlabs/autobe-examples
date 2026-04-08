import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_deletion_by_time_manager_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Admin user with time:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(admin);
  // 2. Add time:manage permission to Admin's role
  const adminMember = admin.member as IHrmPlatformMember.ISummary & { role: { id: string }; organization: { name: string; currency: string } };
  const adminRoleId = adminMember.role.id;
  await api.functional.hrmPlatform.member.roles.permissions.create(
    adminConnection,
    {
      roleId: adminRoleId,
      body: {
        code: "time:manage",
        description: "Manage timesheet operations for all employees",
      } satisfies IHrmPlatformRole.IPermissionCreate,
    },
  );
  // 3. Create project for employee to work on
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: RandomGenerator.alphaNumeric(6),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create Employee user
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: adminMember.organization.name,
      org_currency: adminMember.organization.currency,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 5. Create task for employee
  const task = await generate_random_hrm_platform_member_tasks_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        project_id: project.id,
        assigned_employee_id: employee.member.id,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  const taskWithId = task as IHrmPlatformTask & { id: string };
  // 6. Create timelog for employee on the task
  const startDate = new Date();
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(17, 0, 0, 0);
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    adminConnection,
    {
      body: {
        employee_id: employee.member.id,
        project_id: project.id,
        task_id: taskWithId.id,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        duration_minutes: 480,
        description: "Test work session",
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Create timesheet for employee covering the timelog week
  const weekStartDate = new Date(startDate);
  weekStartDate.setDate(startDate.getDate() - startDate.getDay());
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        start_date: weekStartDate.toISOString(),
        end_date: weekEndDate.toISOString(),
        hrm_platform_employee_id: employee.member.id,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 8. Update timesheet to approved status (simulated approval)
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(adminConnection, {
      timesheetId: timesheet.id,
      body: {
        notes: "Timesheet approved by time manager",
      } satisfies IHrmPlatformTimesheet.IUpdate,
    });
  typia.assert(approvedTimesheet);
  // 9. Delete the approved timesheet as time manager
  await api.functional.hrmPlatform.member.timesheets.erase(adminConnection, {
    timesheetId: timesheet.id,
  });
  // 10. Verify timesheet is soft-deleted by attempting to update it
  await TestValidator.error(
    "approved timesheet cannot be modified after approval",
    async () => {
      await api.functional.hrmPlatform.member.timesheets.update(
        adminConnection,
        {
          timesheetId: timesheet.id,
          body: {
            notes: "Should not be able to update deleted timesheet",
          } satisfies IHrmPlatformTimesheet.IUpdate,
        },
      );
    },
  );
}