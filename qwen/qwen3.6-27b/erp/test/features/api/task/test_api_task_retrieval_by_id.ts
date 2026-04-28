import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task retrieval by unique identifier returning complete task entity.
 *
 * Validates the complete task retrieval flow for a single task by UUID. Authenticates a member, creates a project as the task container, creates a task within that project, and retrieves the task to verify the full entity structure is returned.
 *
 * Special attention is given to verifying that the task's project summary contains correct reference data, that optional fields like assignedEmployee and parentTask are null for unassigned top-level tasks, and that default values for status and priority are correctly applied.
 *
 * 1. Authenticate as member to gain access to organization-scoped resources.
 * 2. Create a project within the member's organization with name and color_code.
 * 3. Create a task within that project with a title.
 * 4. Retrieve the task by its unique identifier using GET /hrmPlatform/member/tasks/{taskId}.
 * 5. Validate response contains complete IHrmPlatformTask entity with all expected fields.
 */
export async function test_api_task_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: {} satisfies DeepPartial<IHrmPlatformProject.ICreate> },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: taskTitle,
      } satisfies DeepPartial<IHrmPlatformTask.ICreate>,
    },
  );
  typia.assert(task);
  // 4. Retrieve task by ID
  const retrievedTask = await api.functional.hrmPlatform.member.tasks.at(
    memberConnection,
    { taskId: task.id },
  );
  typia.assert(retrievedTask);
  // 5. Validate response
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("title matches input", retrievedTask.title, taskTitle);
  TestValidator.equals("status is open", retrievedTask.status, "open");
  TestValidator.equals("priority is medium", retrievedTask.priority, "medium");
  TestValidator.equals(
    "project id matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTask.project.name,
    project.name,
  );
  TestValidator.equals(
    "assigned employee is null",
    retrievedTask.assignedEmployee,
    null,
  );
  TestValidator.equals("parent task is null", retrievedTask.parentTask, null);
  TestValidator.predicate(
    "has created at timestamp",
    retrievedTask.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updated at timestamp",
    retrievedTask.updatedAt !== undefined,
  );
  TestValidator.equals("deletedAt is null", retrievedTask.deletedAt, null);
}
