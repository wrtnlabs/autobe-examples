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
 * Verify that deleting a parent task fails when child subtasks exist (409 Conflict).
 *
 * As a member with Owner or Manager role, attempting to soft-delete a parent task that has subtasks (child tasks with parent_id referencing this task) is blocked by the system with a 409 Conflict error. Deleting a parent task must not cascade-delete its child subtasks, preventing accidental data loss.
 *
 * Special attention is given to verifying that both the parent task and child subtask remain intact after the failed deletion attempt, with their deletedAt fields remaining NULL. This validates the business rule that parent tasks cannot be soft-deleted while subtasks exist.
 *
 * 1. Member joins the platform, creating a default organization and authenticating.
 * 2. Project is created within the member's organization.
 * 3. Parent task is created in the project.
 * 4. Child subtask is created with parent_id referencing the parent task.
 * 5. Soft-deletion of the parent task is attempted and correctly blocked with 409 Conflict.
 * 6. Parent and child tasks remain intact with deletedAt still NULL.
 */
export async function test_api_task_erase_subtask_protection(
  connection: api.IConnection,
): Promise<void> {
  /* 1. Member joins — authenticates and creates organization */
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  /* 2. Create project */
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project);
  /* 3. Create parent task */
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      { params: { projectId: project.id }, body: {} },
    );
  typia.assert(parentTask);
  /* 4. Create child subtask with parent_id */
  const childTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { parent_id: parentTask.id },
      },
    );
  typia.assert(childTask);
  /* 5. Attempt to erase parent task — should fail with 409 Conflict */
  await TestValidator.httpError(
    "parent task with subtasks cannot be deleted (409 Conflict)",
    409,
    async () =>
      await api.functional.hrmPlatform.member.tasks.erase(memberConnection, {
        taskId: parentTask.id,
      }),
  );
}
