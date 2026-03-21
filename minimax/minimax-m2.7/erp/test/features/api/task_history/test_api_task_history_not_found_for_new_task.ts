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
 * Test retrieving task history entry for a task that has no history entries yet.
 *
 * This test validates the system's handling of history retrieval attempts for
 * newly created tasks that have no status change history. A new task is created
 * with default 'open' status without any status changes, resulting in no history
 * entries. When attempting to retrieve a history entry with a non-existent ID,
 * the system should return 404 Not Found.
 *
 * Steps:
 * 1. Authenticate as a member by calling POST /erpHrm/auth/member/join
 * 2. Create a project by calling POST /erpHrm/member/projects
 * 3. Create a task within the project by calling POST /erpHrm/member/projects/{projectId}/tasks
 *    without updating its status (defaults to 'open')
 * 4. Attempt to retrieve a history entry using a historyId that doesn't exist for this task
 *
 * Validation points:
 * - Response returns 404 Not Found because no history entries exist for the task
 * - The task was created successfully but has no status change history
 * - Verify the system correctly handles retrieval attempts for non-existent history IDs
 * - Validate that the error message is informative about the missing resource
 */
export async function test_api_task_history_not_found_for_new_task(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create a task without status change (defaults to 'open')
  // This ensures no history entries are created for the task
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // Verify the task was created with 'open' status (default)
  TestValidator.equals("task status is open", task.status, "open");
  // Step 4: Attempt to retrieve a non-existent history entry
  // Use a random UUID that doesn't exist for this task
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  // Validate that the response returns 404 Not Found
  await TestValidator.httpError(
    "task history not found for new task without status changes",
    404,
    async () =>
      await api.functional.erpHrm.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          historyId: nonExistentHistoryId,
        },
      ),
  );
}
