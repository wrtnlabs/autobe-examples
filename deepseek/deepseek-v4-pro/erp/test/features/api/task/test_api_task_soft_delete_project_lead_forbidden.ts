import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Verify that a project lead is forbidden from soft-deleting tasks despite having
 * task creation and management authority within their project.
 *
 * Validates the authorization boundary between project-lead role (task management
 * within a project) and the `project:manage` permission (organization-wide project
 * management). A project lead can create and manage tasks in their project, but
 * task deletion is exclusively reserved for users with `project:manage` permission.
 *
 * 1. Manager (Owner with `project:manage`) creates an active project.
 * 2. A second member joins and is invited as an employee, then assigned as
 *    `project-lead` on the project.
 * 3. The project lead successfully creates a task, confirming their task
 *    management authority within the project.
 * 4. The project lead attempts to soft-delete the same task — the system must
 *    reject the request with a 403 Forbidden response, confirming that deletion
 *    requires `project:manage` and is not available to project leads.
 */
export async function test_api_task_soft_delete_project_lead_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins (first member, becomes Owner with project:manage permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 2. Manager creates an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 3. Project lead member joins (separate account, no organization yet)
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLead = await authorize_member_join(projectLeadConnection, {});
  typia.assert(projectLead);
  // 4. Manager invites the project lead as an employee in the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: projectLead.email,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Manager assigns the employee as project-lead on the project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Project lead creates a task — confirms valid task management authority
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    projectLeadConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 7. Project lead attempts to soft-delete the task — must be rejected with 403
  await TestValidator.httpError(
    "project lead cannot soft-delete task",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(
        projectLeadConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
