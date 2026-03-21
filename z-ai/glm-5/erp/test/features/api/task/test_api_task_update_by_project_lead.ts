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

export async function test_api_task_update_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a project in the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>(),
      },
    },
  );
  typia.assert(project);
  // 3. Create an employee record for the authenticated member
  // Use the generation function with member's email - roleId will be handled internally
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: member.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // 4. Add the employee to the project with 'project_lead' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // Store original values for comparison
  const originalUpdatedAt = task.updatedAt;
  // Wait a moment to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Update the task with modified fields
  const updateBody: IErpHrmTask.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "in-progress",
    priority: "high",
    estimatedHours: 8,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTask);
  // 7. Validate the response
  TestValidator.equals("task id unchanged", updatedTask.id, task.id);
  TestValidator.equals("title updated", updatedTask.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    updateBody.description,
  );
  TestValidator.equals("status updated", updatedTask.status, updateBody.status);
  TestValidator.equals(
    "priority updated",
    updatedTask.priority,
    updateBody.priority,
  );
  TestValidator.equals(
    "estimated hours updated",
    updatedTask.estimatedHours,
    updateBody.estimatedHours,
  );
  TestValidator.equals(
    "due date updated",
    updatedTask.dueDate,
    updateBody.dueDate,
  );
  TestValidator.equals("project unchanged", updatedTask.project.id, project.id);
  TestValidator.notEquals(
    "updated_at changed",
    updatedTask.updatedAt,
    originalUpdatedAt,
  );
}
