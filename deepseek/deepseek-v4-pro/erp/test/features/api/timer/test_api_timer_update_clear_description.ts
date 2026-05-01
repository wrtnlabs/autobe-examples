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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
 * Verify that an employee can clear the description on a running timer by setting it to null.
 *
 * Validates that null is treated as an explicit clear operation distinct from omitting the field. The employee starts a timer with a description, then updates it with description explicitly set to null. The system returns the updated timer with description null, the original start_timestamp preserved, and the updated_at timestamp reflecting the modification.
 *
 * Project, task, and employee ownership remain unchanged after the update, confirming that only the description field was affected.
 *
 * 1. Organization owner joins and authenticates.
 * 2. Owner creates a custom role for employee assignment.
 * 3. A separate employee member joins the platform.
 * 4. Owner creates an employee record for the employee member with the custom role.
 * 5. Owner creates a project for time tracking.
 * 6. Owner assigns the employee as a project member.
 * 7. Employee starts a timer on the project with a description and no task.
 * 8. Employee updates the timer, setting description to null.
 * 9. Validates description is null, timestamps reflect update, and project/employee/task ownership unchanged.
 */
export async function test_api_timer_update_clear_description(
  connection: api.IConnection,
) {
  // 1. Owner (org creator) joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Employee joins (separate member)
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
  // 6. Owner assigns employee to project
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: { erp_hrm_employee_id: employee.id },
      },
    );
  typia.assert(membership);
  // 7. Employee starts a timer with description (no task)
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: timerDescription,
        erp_hrm_task_id: null,
      },
    },
  );
  typia.assert(timer);
  // 8. Employee updates timer to clear description
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    employeeConnection,
    {
      timerId: timer.id,
      body: { description: null } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 9. Validate results
  TestValidator.equals(
    "description should be null",
    updatedTimer.description,
    null,
  );
  TestValidator.equals("timer id preserved", updatedTimer.id, timer.id);
  TestValidator.equals(
    "start_timestamp preserved",
    updatedTimer.start_timestamp,
    timer.start_timestamp,
  );
  TestValidator.equals(
    "project unchanged",
    updatedTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedTimer.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "task unchanged",
    updatedTimer.task?.id ?? null,
    timer.task?.id ?? null,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTimer.updated_at,
    timer.updated_at,
  );
}
