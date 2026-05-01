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
 * Test that an employee can update the description of a running timer without stopping it.
 *
 * Validates the timer update flow where an employee modifies their activity description while
 * the timer continues tracking. The employee starts a timer with an initial description against
 * a project they belong to, then updates the description mid-session. The system must return
 * the updated timer with the new description, the original start_timestamp preserved unchanged,
 * and the updated_at timestamp reflecting the modification time.
 *
 * The project, task, and employee ownership must remain unchanged after the update, confirming
 * that only the mutable description field was modified.
 *
 * 1. Owner member joins and creates an organization.
 * 2. Employee member joins separately with their own account.
 * 3. Owner creates a custom role for permission assignment.
 * 4. Owner invites the employee to the organization with the created role.
 * 5. Owner creates a project for time tracking.
 * 6. Owner assigns the employee as a project member.
 * 7. Employee starts a running timer with an initial description on the project.
 * 8. Employee updates the timer description while it continues running.
 * 9. Validates the updated description, preserved start_timestamp, changed updated_at,
 *    and unchanged project and employee ownership.
 */
export async function test_api_timer_update_description_while_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Employee member joins separately
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 3. Owner creates a custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 4. Owner invites the employee to the organization
  const employeeRecord = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employee.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employeeRecord);
  // 5. Owner creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 6. Owner assigns the employee as a project member
  const projectMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          erp_hrm_employee_id: employeeRecord.id,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMembership);
  // 7. Employee starts a running timer with an initial description
  const initialDescription = "Initial work on feature";
  const timer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // 8. Employee updates the timer description while it continues running
  const newDescription = "Updated - now working on something else";
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    employeeConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 9. Validate the update results
  TestValidator.equals(
    "description updated to new value",
    updatedTimer.description,
    newDescription,
  );
  TestValidator.equals(
    "start_timestamp preserved after update",
    updatedTimer.start_timestamp,
    timer.start_timestamp,
  );
  TestValidator.notEquals(
    "updated_at reflects modification time",
    updatedTimer.updated_at,
    timer.updated_at,
  );
  TestValidator.equals(
    "project ownership unchanged",
    updatedTimer.project.id,
    timer.project.id,
  );
  TestValidator.equals(
    "employee ownership unchanged",
    updatedTimer.employee.id,
    timer.employee.id,
  );
}
