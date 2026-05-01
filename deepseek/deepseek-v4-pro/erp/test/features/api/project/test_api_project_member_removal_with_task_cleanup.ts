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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test complete employee removal from project with task assignment cleanup.
 *
 * Validates the full lifecycle of removing an employee from a project and its
 * side effects on assigned tasks. After authenticating as a member with Owner
 * role, the test creates a custom role, an active project, an employee with
 * the custom role, assigns the employee to the project, creates a task assigned
 * to that employee, and then removes the employee from the project.
 *
 * Special attention is given to verifying that the task is correctly assigned
 * to the employee before removal and that the DELETE endpoint returns 204 No
 * Content upon successful soft-deletion of the membership record.
 *
 * 1. Authenticate as a member with Owner role via the join endpoint.
 * 2. Create a custom role for the employee's role assignment.
 * 3. Create an active project for membership and task scoping.
 * 4. Invite an employee with the custom role to the organization.
 * 5. Assign the employee to the project as a member.
 * 6. Create a task within the project assigned to the employee.
 * 7. Verify the task's assigned employee matches the invited employee.
 * 8. Remove the employee from the project via the DELETE endpoint.
 * 9. Confirm the API returns void (204 No Content) on successful removal.
 */
export async function test_api_project_member_removal_with_task_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with Owner role
  const adminConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(adminConnection, {});
  typia.assert(member);
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {});
  typia.assert(role);
  // 3. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 4. Invite an employee with the custom role
  const employee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: { erp_hrm_role_id: role.id },
    },
  );
  typia.assert(employee);
  // 5. Assign the employee to the project as a member
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: { erp_hrm_employee_id: employee.id },
      },
    );
  typia.assert(membership);
  // 6. Create a task assigned to the employee
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: { assigned_employee_id: employee.id },
    },
  );
  typia.assert(task);
  // 7. Verify the task was assigned to the correct employee
  TestValidator.predicate(
    "task assigned to correct employee",
    task.assignedEmployee !== null && task.assignedEmployee.id === employee.id,
  );
  // 8. Remove the employee from the project
  await api.functional.erpHrm.member.projects.members.erase(adminConnection, {
    projectId: project.id,
    employeeId: employee.id,
  });
}
