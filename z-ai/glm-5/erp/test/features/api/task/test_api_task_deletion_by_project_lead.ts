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

export async function test_api_task_deletion_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner (has implicit project:manage and employee:manage permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      displayName: "Project Owner",
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create a project using owner's connection
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: "Test Project for Task Deletion",
        color_code: "#FF5733" satisfies string &
          tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
      },
    },
  );
  typia.assert(project);
  // Step 3: Create project lead member (separate member account)
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(projectLeadConnection, {
    body: {
      displayName: "Project Lead User",
    },
  });
  typia.assert(projectLeadAuth);
  // Step 4: Create employee record for project lead using owner's connection
  // Owner has employee:manage permission and can add the new member as employee
  const projectLeadEmployee =
    await generate_random_erp_hrm_member_employees_create(ownerConnection, {
      body: {
        email: projectLeadAuth.email,
        employmentType: "full_time",
      },
    });
  typia.assert(projectLeadEmployee);
  // Step 5: Add project lead to the project with 'project_lead' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: projectLeadEmployee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: Create a task using project lead's connection
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task to be deleted by project lead",
        description:
          "This task will be deleted to test project lead deletion permission",
      },
    },
  );
  typia.assert(task);
  // Verify task was created successfully
  TestValidator.predicate(
    "task should have valid ID",
    task.id !== null && task.id !== undefined,
  );
  TestValidator.predicate(
    "task should not be deleted initially",
    task.deletedAt === null,
  );
  // Step 7: Delete the task using project lead's authentication
  // This verifies that project_lead role has permission to delete tasks
  await api.functional.erpHrm.member.projects.tasks.erase(
    projectLeadConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  // Note: Soft delete verification would require a GET task endpoint to verify deleted_at is set
  // The deletion operation completing without error indicates the project lead has deletion permission
}
