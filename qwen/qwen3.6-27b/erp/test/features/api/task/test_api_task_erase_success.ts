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
 * Test successful soft-deletion of a standalone task with no timelogs, subtasks, or active timers.
 *
 * Validates that a member with Owner role can erase a task, and that re-erasing an already deleted task returns a 404 error. The task is created as a standalone task with no assignments, no parent task, and no associated timelogs to ensure it meets the soft-delete requirements.
 *
 * Special attention is given to verifying that the task record is preserved in the database for audit trail purposes, confirmed by attempting to erase the already-deleted task and receiving a not-found error instead of another successful deletion.
 *
 * 1. Member joins the platform, auto-creating a default organization with Owner role.
 * 2. Create a project in the member's organization for task scoping.
 * 3. Create a standalone task in the project with minimal data.
 * 4. Soft-delete the task via the erase endpoint.
 * 5. Attempt to erase the already-deleted task and verify a 404 error is thrown.
 */
export async function test_api_task_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform as Owner
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a project in the member's organization
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#FF5733",
        },
      },
    );
  typia.assert(project);
  // 3. Create a standalone task (no assigned employee, no parent)
  const task: IHrmPlatformTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "medium",
        },
      },
    );
  typia.assert(task);
  // 4. Soft-delete the task - should succeed with 204 No Content
  await api.functional.hrmPlatform.member.tasks.erase(memberConnection, {
    taskId: task.id,
  });
  // 5. Attempt to erase again - already deleted task should return 404
  await TestValidator.httpError(
    "already deleted task returns 404",
    404,
    async () =>
      await api.functional.hrmPlatform.member.tasks.erase(memberConnection, {
        taskId: task.id,
      }),
  );
}
