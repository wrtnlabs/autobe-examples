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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test that updating a task's parent to an already-nested subtask is rejected.
 *
 * Validates the one-level subtask nesting depth rule during task update operations. The system allows a task to become a subtask of a top-level task, but forbids nesting under a task that is itself already a subtask — enforcing a maximum nesting depth of one.
 *
 * 1. Member authenticates via join and obtains a JWT access token.
 * 2. Project is created in active status to host all test tasks.
 * 3. Member is assigned as project-lead to gain task management authority.
 * 4. Task A is created at the top level with no parent, serving as a valid parent candidate.
 * 5. Task B is created as a subtask of Task A, making Task B a subtask that already has a parent of its own.
 * 6. Task C is created independently with no parent, serving as the update target.
 * 7. Attempting to set Task C's parentTaskId to Task B's ID is rejected because Task B is already a subtask — the one-level nesting constraint is enforced.
 * 8. Verifying Task C remains unchanged by updating its title and confirming parentTask is still null, ensuring the rejected update did not corrupt the task state.
 */
export async function test_api_task_update_parent_already_subtask(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign member as project-lead
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: { role: "project-lead" },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Create Task A (top-level, no parent)
  const taskA = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(taskA);
  // 5. Create Task B (subtask with parent = Task A)
  const taskB = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: { parent_task_id: taskA.id },
      params: { projectId: project.id },
    },
  );
  typia.assert(taskB);
  // 6. Create Task C (independent, no parent)
  const taskC = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(taskC);
  // 7. Attempt to set Task C's parent to Task B — must be rejected
  await TestValidator.error(
    "cannot set parent to a task that is already a subtask",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.update(
        memberConnection,
        {
          projectId: project.id,
          taskId: taskC.id,
          body: {
            parentTaskId: taskB.id,
          } satisfies IErpHrmTask.IUpdate,
        },
      );
    },
  );
  // 8. Verify Task C remains unchanged — parentTask is still null
  const updatedTaskC = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: taskC.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTaskC);
  TestValidator.equals(
    "task C parent should still be null after rejected parent update",
    updatedTaskC.parentTask,
    null,
  );
}
