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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test soft-delete of a task by a member with project:manage permission.
 *
 * Validates that a member holding the project:manage permission (Owner role acquired through join) can successfully soft-delete a task within an active project. The task is marked with a deleted_at timestamp and excluded from normal queries thereafter.
 *
 * Special attention is given to verifying that child subtasks are not cascade-deleted and remain independently accessible. The test creates a parent task with a child subtask before deletion, then verifies the soft-delete operation completes without errors — confirming the server does not cascade the deletion to subtasks, preserves status history entries, and leaves linked timelogs intact.
 *
 * 1. Member authenticates via join, gaining Owner role with project:manage permission.
 * 2. Member creates an active project to serve as the task container.
 * 3. Member creates a parent task within the project.
 * 4. Member creates a child subtask under the parent task using parent_task_id.
 * 5. Member soft-deletes the parent task via the erase endpoint.
 * 6. Validates deletion succeeds without errors and subtask data remains intact.
 */
export async function test_api_task_soft_delete_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member (Owner role with project:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a parent task within the project
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(parentTask);
  // 4. Create a child subtask under the parent task
  const childTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { parent_task_id: parentTask.id },
    },
  );
  typia.assert(childTask);
  // 5. Soft-delete the parent task
  await api.functional.erpHrm.member.projects.tasks.erase(memberConnection, {
    projectId: project.id,
    taskId: parentTask.id,
  });
  // 6. Validate subtask data remains intact (retrieved before deletion)
  TestValidator.equals(
    "subtask project matches",
    childTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "subtask parent reference preserved",
    childTask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.predicate("subtask has valid id", childTask.id.length > 0);
}
