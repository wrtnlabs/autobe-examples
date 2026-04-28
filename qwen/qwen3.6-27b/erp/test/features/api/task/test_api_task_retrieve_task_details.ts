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
 * Test retrieving detailed task information within a project.
 *
 * Validates the complete workflow of task detail retrieval: authenticating a member, creating a project, creating a task within that project, and then retrieving the full task details by projectId and taskId. Ensures the response contains all expected task fields including title, description, status, priority, estimated hours, due date, and timestamps. Also verifies that related entities are correctly embedded, including the owning project summary and optional assigned employee or parent task references.
 *
 * This test validates the core task retrieval feature with proper multi-tenancy via project scoping, confirming that project membership provides authorization to view task details within their projects.
 *
 * 1. Authenticate as a member to access project tasks.
 * 2. Create a project that will own the task.
 * 3. Create a task within the project for retrieval.
 * 4. Retrieve the task by projectId and taskId.
 * 5. Validate task details match input data and related entities are included.
 */
export async function test_api_task_retrieve_task_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} as DeepPartial<IHrmPlatformMember.IJoin>,
  });
  // 2. Create project
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {} as DeepPartial<IHrmPlatformProject.ICreate>,
      },
    );
  typia.assert(project);
  // 3. Create task within project
  const task: IHrmPlatformTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        body: {} as DeepPartial<IHrmPlatformTask.ICreate>,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 4. Retrieve task by projectId and taskId
  const retrievedTask: IHrmPlatformTask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(retrievedTask);
  // 5. Validate task details
  TestValidator.equals("task ID matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTask.project.name,
    project.name,
  );
  TestValidator.predicate("has created timestamp", !!retrievedTask.createdAt);
  TestValidator.predicate("has updated timestamp", !!retrievedTask.updatedAt);
}
