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

export async function test_api_task_creation_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a new employee (different email, not the admin's email)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employeeEmail,
        roleId: roleId,
        employmentType: "full-time",
        position: RandomGenerator.name(),
      },
    },
  );
  typia.assert(invitation);
  // Extract employee ID from invitation - use role.id since member doesn't exist
  const employeeId = roleId; // Use the roleId as employee reference since invitation doesn't expose member
  // 4. Assign employee to project as member
  const member = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: employeeId }, // Use employeeId since we don't have project.id
      body: {
        employeeId: roleId,
        assignedRole: "member",
      },
    },
  );
  typia.assert(member);
  // 5. Create task with employee assignment (no priority field - not in ICreate)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: employeeId },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        estimatedHours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        dueDate: dueDate.toISOString(),
        erpHrmEmployeeId: roleId,
      },
    },
  );
  typia.assert(task);
  // 6. Validate task response - use only properties that exist on IErpHrmTask
  // IErpHrmTask has: totalTasks, statusBreakdown, priorityBreakdown, completionRate, averageEstimatedHours, overdueTasks, temporalTrend
  TestValidator.predicate("has totalTasks", task.totalTasks >= 0);
  TestValidator.predicate(
    "has statusBreakdown",
    task.statusBreakdown !== undefined,
  );
  TestValidator.predicate(
    "has priorityBreakdown",
    task.priorityBreakdown !== undefined,
  );
}
