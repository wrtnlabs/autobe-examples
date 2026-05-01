import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test that stopping a timer immediately after starting creates a zero-duration timelog.
 *
 * Validates the edge case where an employee accidentally starts a timer and immediately stops it within a few seconds. The elapsed duration rounds to 0 minutes, but the system must still create a timelog with `duration_minutes = 0` and carry over the timer's project, description, and other metadata.
 *
 * 1. Owner-member joins and establishes the organization.
 * 2. Owner creates a custom role to assign to the employee.
 * 3. Employee-member joins with their own account.
 * 4. Owner creates an employee record for the employee-member via email invitation.
 * 5. Owner creates a project and assigns the employee as a project member.
 * 6. Employee starts a live timer with a known description against the project.
 * 7. Employee immediately stops the timer, verifying the resulting timelog has zero duration, matches the project, carries the description, defaults to billable, and has no timesheet. Also verifies the timer is deleted by starting a new timer successfully.
 */
export async function test_api_timer_stop_immediate_zero_duration_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Employee member joins with their own account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeMember);
  // 4. Owner creates employee record for the employee member
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeMember.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Owner creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 6. Owner assigns employee as project member
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: { erp_hrm_employee_id: employee.id },
    },
  );
  // 7. Employee starts a timer with a known description
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // 8. Employee stops the timer immediately
  const timelog = await api.functional.erpHrm.member.timers.stop(
    employeeConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(timelog);
  // 9. Validate zero-duration timelog
  TestValidator.equals(
    "duration_minutes is zero for immediate stop",
    timelog.duration_minutes,
    0,
  );
  TestValidator.equals(
    "timelog project matches timer project",
    timelog.project.id,
    timer.project.id,
  );
  TestValidator.equals(
    "description carries over from timer",
    timelog.description,
    timerDescription,
  );
  TestValidator.equals("timelog defaults to billable", timelog.billable, true);
  TestValidator.equals(
    "timelog is not assigned to any timesheet",
    timelog.timesheet,
    null,
  );
  TestValidator.equals(
    "timelog employee matches created employee",
    timelog.employee.id,
    employee.id,
  );
  // 10. Verify timer was deleted by starting a new one
  const newTimer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
      },
    },
  );
  typia.assert(newTimer);
}
