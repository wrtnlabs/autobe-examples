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

export async function test_api_task_retrieval_with_subtasks(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate member (becomes organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create parent task
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(parentTask);
  // Step 4: Create subtask with parent_task_id reference
  const subtask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        parent_task_id: parentTask.id,
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(subtask);
  // Step 5: Retrieve parent task with subtasks
  const retrievedTask = await api.functional.erpHrm.member.projects.tasks.at(
    memberConnection,
    {
      projectId: project.id,
      taskId: parentTask.id,
    },
  );
  typia.assert(retrievedTask);
  // Validations
  // 1. Parent task response includes subtasks array with one entry
  TestValidator.equals(
    "subtasks array length",
    retrievedTask.subtasks.length,
    1,
  );
  // 2. Subtask reference matches the created subtask
  const retrievedSubtask = retrievedTask.subtasks[0];
  TestValidator.equals("subtask id", retrievedSubtask.id, subtask.id);
  TestValidator.equals("subtask title", retrievedSubtask.title, subtask.title);
  TestValidator.equals(
    "subtask status",
    retrievedSubtask.status,
    subtask.status,
  );
  TestValidator.equals(
    "subtask priority",
    retrievedSubtask.priority,
    subtask.priority,
  );
  // 3. Subtask's hasSubtasks property is false (one-level nesting)
  TestValidator.predicate(
    "subtask hasSubtasks is false",
    retrievedSubtask.hasSubtasks === false,
  );
  // 4. Subtask project association (via parent task)
  TestValidator.equals(
    "parent task project id",
    retrievedTask.project.id,
    project.id,
  );
  // 5. Parent task includes status history
  TestValidator.predicate(
    "histories array exists",
    Array.isArray(retrievedTask.histories),
  );
  // 6. Validate histories are sorted by created_at descending
  TestValidator.predicate(
    "histories sorted by created_at descending",
    (() => {
      if (retrievedTask.histories.length <= 1) return true;
      for (let i = 0; i < retrievedTask.histories.length - 1; i++) {
        const current = retrievedTask.histories[i];
        const next = retrievedTask.histories[i + 1];
        if (
          new Date(current.createdAt).getTime() <
          new Date(next.createdAt).getTime()
        ) {
          return false;
        }
      }
      return true;
    })(),
  );
  // 7. Validate task is not a subtask (no parentTask)
  TestValidator.equals("parentTask is null", retrievedTask.parentTask, null);
  // 8. Validate subtask parent reference
  TestValidator.equals(
    "subtask parent id",
    subtask.parentTask?.id,
    parentTask.id,
  );
}
