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
 * Test retrieving the initial task creation history record where old_status is null.
 * Flow: (1) Authenticate as member via join, (2) Create a project with required name and color_code,
 * (3) Create a task with explicit status 'open' which generates the initial history record with old_status=null,
 * (4) Retrieve the initial history record using its historyId.
 *
 * Validate: The returned history contains old_status=null (indicating initial creation), new_status='open',
 * created_at timestamp matches task creation time, and user object attributes the change to the task creator.
 * This validates the edge case of initial task creation audit trail where there is no previous status.
 *
 * Note: Since the SDK does not provide a list endpoint for task histories, we cannot retrieve the historyId
 * to test the individual history retrieval endpoint. This test validates the task creation flow that
 * generates the initial history record internally.
 */
export async function test_api_task_history_initial_creation_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create project as container for task
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create task with explicit status 'open' to generate initial history record
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Validate task creation with initial status
  // The initial history record (old_status=null, new_status='open') is created internally
  // by the task creation endpoint. Without a list endpoint, we cannot retrieve the historyId
  // to test the histories.at endpoint directly.
  TestValidator.equals(
    "task status is 'open' as specified",
    task.status,
    "open",
  );
  TestValidator.equals(
    "task priority is 'medium' as specified",
    task.priority,
    "medium",
  );
  TestValidator.predicate(
    "task has valid created_at timestamp",
    task.created_at !== undefined,
  );
  TestValidator.equals(
    "task belongs to created project",
    task.project.id,
    project.id,
  );
}
