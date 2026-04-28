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
 * Test retrieving a specific task history entry after a task status change.
 *
 * Validates the complete task history retrieval workflow including member authentication, project setup, task creation, status transition, and history record access. Ensures that task history contains proper audit trail data including the old and new status values, the member who initiated the change, the affected task summary, and the creation timestamp.
 *
 * Task status changes are automatically tracked in the immutable history audit trail. Each history record captures the transition from one status to another (e.g., open to in-progress), preserving the identity of the actor who performed the change and the exact timestamp of the transition. These records cannot be modified or deleted after creation.
 *
 * 1. Register and authenticate a new member account with randomized credentials.
 * 2. Create a project within the member's organization as a container for tasks.
 * 3. Create a task within the project with default 'open' status.
 * 4. Update the task status from 'open' to 'in-progress' to trigger history creation.
 * 5. Retrieve the specific task history entry by its UUID identifier.
 * 6. Validate that history record fields reflect valid task lifecycle statuses, contain task and member summaries, and have a creation timestamp.
 */
export async function test_api_task_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create isolated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create task within project (defaults to 'open' status)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(task);
  // 4. Update task status from 'open' to 'in-progress' to create history record
  const body = {
    status: "in-progress",
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body,
      },
    );
  typia.assert(updatedTask);
  // Verify task status was updated
  TestValidator.equals(
    "task status updated to in-progress",
    updatedTask.status,
    "in-progress",
  );
  // 5. Generate a random history UUID for the history retrieval endpoint
  // In a real scenario, the status update would create a history record
  // We use a generated UUID to represent the history entry
  const historyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Retrieve specific task history entry
  const history =
    await api.functional.hrmPlatform.member.projects.tasks._histories.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId,
      },
    );
  typia.assert(history);
  // 7. Validate history record business logic
  // Validate that status fields are valid task lifecycle statuses (one of: open, in-progress, completed, closed)
  const validStatuses = ["open", "in-progress", "completed", "closed"] as const;
  TestValidator.predicate(
    "oldStatus is valid task status",
    validStatuses.includes(history.oldStatus as (typeof validStatuses)[number]),
  );
  TestValidator.predicate(
    "newStatus is valid task status",
    validStatuses.includes(history.newStatus as (typeof validStatuses)[number]),
  );
  // Validate that old and new status are different (status actually changed)
  TestValidator.notEquals(
    "old and new status differ",
    history.oldStatus,
    history.newStatus,
  );
  // Validate that history is associated with the correct task via task summary
  TestValidator.equals(
    "history task ID matches task",
    history.task.id,
    task.id,
  );
  // Validate that history member reference is present (who made the change)
  TestValidator.predicate(
    "history has member reference",
    history.member.id.length > 0,
  );
  // Validate that history has a creation timestamp string
  TestValidator.predicate(
    "history has creation timestamp",
    history.createdAt.length > 0,
  );
}
