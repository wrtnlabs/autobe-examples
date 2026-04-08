import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_reassignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  const safeProject = typia.assert<IErpHrmProject & { id: string }>(project);
  // 3. Create employee - returns IErpHrmInvitation with member info
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        employmentType: "full-time",
        roleId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  // Get the employee ID from the invitation response
  // The invitation contains member info which is the employee reference
  const employeeId = (
    invitation as IErpHrmInvitation & {
      member?: IErpHrmMember.ISummary;
    }
  ).member?.id;
  // 4. Assign employee to project as member
  const member = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: safeProject.id },
      body: {
        assignedRole: "member",
        employeeId: employeeId!,
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(member);
  // 5. Create task without assignment
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: safeProject.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        erpHrmEmployeeId: null,
      } satisfies IErpHrmTask.ICreate,
    },
  );
  const safeTask = typia.assert<IErpHrmTask & { id: string }>(task);
  // 6. Assign task to project member via PUT
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: safeProject.id,
      taskId: safeTask.id,
      body: {
        erp_hrm_employee_id: employeeId,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  const safeUpdatedTask = typia.assert<
    IErpHrmTask & { id: string; erpHrmEmployeeId: string | null }
  >(updatedTask);
  // Validate: task ID remains the same (update succeeded)
  TestValidator.equals(
    "task ID preserved after update",
    safeUpdatedTask.id,
    safeTask.id,
  );
  TestValidator.equals(
    "task assigned to project member",
    safeUpdatedTask.erpHrmEmployeeId,
    employeeId,
  );
}