import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task status change with automatic history logging.
 *
 * This test verifies that when a task's status is updated, the system
 * automatically creates history entries tracking the status changes.
 * The test follows the complete workflow: open → in-progress → completed → closed.
 */
export async function test_api_task_status_change_with_history_logging(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${typia.random<string & tags.MinLength<6> & tags.MaxLength<6>>()}`,
      },
    },
  );
  typia.assert(project);
  // 3. Create a task with initial status 'open'
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
        estimated_hours: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(task);
  TestValidator.equals("initial status is open", task.status, "open");
  const initialUpdatedAt = task.updated_at;
  // 4. Update task status from 'open' to 'in-progress'
  const updatedTask1 = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);
  TestValidator.equals(
    "status changed to in-progress",
    updatedTask1.status,
    "in-progress",
  );
  TestValidator.notEquals(
    "updated_at changed after status update",
    initialUpdatedAt,
    updatedTask1.updated_at,
  );
  // 5. Update task status from 'in-progress' to 'completed'
  const updatedTask2 = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);
  TestValidator.equals(
    "status changed to completed",
    updatedTask2.status,
    "completed",
  );
  TestValidator.notEquals(
    "updated_at changed after second status update",
    updatedTask1.updated_at,
    updatedTask2.updated_at,
  );
  // 6. Update task status from 'completed' to 'closed'
  const updatedTask3 = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        status: "closed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask3);
  TestValidator.equals(
    "status changed to closed",
    updatedTask3.status,
    "closed",
  );
  TestValidator.notEquals(
    "updated_at changed after third status update",
    updatedTask2.updated_at,
    updatedTask3.updated_at,
  );
  // 7. Verify the complete workflow - each status transition was successful
  TestValidator.predicate(
    "all status transitions completed successfully",
    () =>
      updatedTask1.status === "in-progress" &&
      updatedTask2.status === "completed" &&
      updatedTask3.status === "closed",
  );
  // 8. Verify timestamps are monotonically increasing
  TestValidator.predicate(
    "timestamps are monotonically increasing",
    () =>
      new Date(initialUpdatedAt).getTime() <
        new Date(updatedTask1.updated_at).getTime() &&
      new Date(updatedTask1.updated_at).getTime() <
        new Date(updatedTask2.updated_at).getTime() &&
      new Date(updatedTask2.updated_at).getTime() <
        new Date(updatedTask3.updated_at).getTime(),
  );
}
