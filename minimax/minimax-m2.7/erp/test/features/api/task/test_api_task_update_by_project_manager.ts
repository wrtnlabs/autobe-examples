import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test that a member with project:manage permission can successfully update
 * task attributes including title, description, status, priority, estimated
 * hours, and due date. Verify the response returns the complete updated task
 * entity with all modified fields reflected correctly. Validate that status
 * transitions work correctly (e.g., open to in-progress). This is the primary
 * success path for task modification by organization-level administrators.
 */
export async function test_api_task_update_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member with project:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a project to contain the task
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A7AFE",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 4. Prepare update data with new values
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newStatus = "in-progress";
  const newPriority = "high";
  const newEstimatedHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const newDueDate = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  // 5. Update the task
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        title: newTitle,
        description: newDescription,
        status: newStatus,
        priority: newPriority,
        estimated_hours: newEstimatedHours,
        due_date: newDueDate,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 6. Validate the updated task
  TestValidator.equals("title updated correctly", updatedTask.title, newTitle);
  TestValidator.equals(
    "description updated correctly",
    updatedTask.description,
    newDescription,
  );
  TestValidator.equals(
    "status updated to in-progress",
    updatedTask.status,
    newStatus,
  );
  TestValidator.equals(
    "priority updated to high",
    updatedTask.priority,
    newPriority,
  );
  TestValidator.equals(
    "estimated_hours updated correctly",
    updatedTask.estimated_hours,
    newEstimatedHours,
  );
  TestValidator.equals(
    "due_date updated correctly",
    updatedTask.due_date,
    newDueDate,
  );
  TestValidator.equals("task ID unchanged", updatedTask.id, task.id);
  TestValidator.equals("project unchanged", updatedTask.project.id, project.id);
}
