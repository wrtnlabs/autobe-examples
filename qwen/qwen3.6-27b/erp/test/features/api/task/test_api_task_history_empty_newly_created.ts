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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
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
 * Test that task history returns an empty result set when a task has just been created and no status changes have occurred yet.
 *
 * Validates the task history endpoint behavior for newly created tasks. When a task is first created, it starts with the default 'open' status but no status transitions have occurred, meaning the history audit trail should be empty. This test verifies that the pagination response structure remains valid even with zero records.
 *
 * The test follows the complete setup flow: member registration, project creation, and task creation, then queries the history endpoint without performing any status changes. This ensures the endpoint correctly handles the edge case of tasks with no transition history.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create a project within the member's organization.
 * 3. Create a task within the project (status defaults to 'open', no transitions yet).
 * 4. Query the task history endpoint for the newly created task.
 * 5. Verify the response contains an empty data array with valid pagination metadata reflecting 0 records.
 */
export async function test_api_task_history_empty_newly_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task in the project (no status changes made)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {},
    },
  );
  typia.assert(task);
  // 4. Query task history - should be empty since task was just created
  const history =
    await api.functional.hrmPlatform.member.projects.tasks._histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(history);
  // 5. Validate empty history response
  TestValidator.equals("data array is empty", history.data.length, 0);
  TestValidator.equals("total records is 0", history.pagination.records, 0);
  TestValidator.predicate(
    "pagination is valid",
    history.pagination.pages === 0 || history.pagination.pages === 1,
  );
}
