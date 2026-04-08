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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test task history retrieval with status transitions.
 *
 * Validates the complete task history workflow including member authentication, project creation, task creation, multiple status updates, and history retrieval. Ensures that the immutable audit trail correctly captures all status transitions with accurate metadata.
 *
 * Special attention is given to verifying that history entries are returned in chronological order (newest first), each entry contains all required fields (id, oldStatus, newStatus, createdAt, member), and the number of entries matches the number of status changes performed.
 *
 * 1. Member registers and authenticates to obtain access token.
 * 2. Member creates a project to contain the task.
 * 3. Member creates a task within the project with initial status 'open'.
 * 4. Member updates task status from 'open' to 'in-progress' to generate first history entry.
 * 5. Member updates task status from 'in-progress' to 'completed' to generate second history entry.
 * 6. Member queries task history endpoint to retrieve all status change records.
 * 7. Validates history entries are in correct order, contain accurate transition data, and match expected count.
 */
export async function test_api_task_history_retrieval_with_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create task with initial status 'open'
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 4. Update task status from 'open' to 'in-progress' (first history entry)
  const taskInProgress =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          title: task.title,
          status: "in-progress",
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskInProgress);
  // 5. Update task status from 'in-progress' to 'completed' (second history entry)
  const taskCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          title: task.title,
          status: "completed",
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskCompleted);
  // 6. Query task history endpoint
  const historyResponse =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 7. Validate pagination metadata
  TestValidator.equals("current page", historyResponse.pagination.current, 1);
  TestValidator.equals("total records", historyResponse.pagination.records, 2);
  TestValidator.equals("total pages", historyResponse.pagination.pages, 1);
  // 8. Validate history entries count
  TestValidator.equals("history entries count", historyResponse.data.length, 2);
  // 9. Validate history entries are in chronological order (newest first)
  const firstEntry = historyResponse.data[0];
  const secondEntry = historyResponse.data[1];
  TestValidator.predicate(
    "newest entry first",
    () =>
      new Date(firstEntry.createdAt).getTime() >=
      new Date(secondEntry.createdAt).getTime(),
  );
  // 10. Validate first entry (in-progress → completed)
  TestValidator.equals(
    "first entry newStatus",
    firstEntry.newStatus,
    "completed",
  );
  TestValidator.equals(
    "first entry oldStatus",
    firstEntry.oldStatus,
    "in-progress",
  );
  TestValidator.equals(
    "first entry member id",
    firstEntry.member.id,
    memberAuth.id,
  );
  // 11. Validate second entry (open → in-progress)
  TestValidator.equals(
    "second entry newStatus",
    secondEntry.newStatus,
    "in-progress",
  );
  TestValidator.equals("second entry oldStatus", secondEntry.oldStatus, "open");
  TestValidator.equals(
    "second entry member id",
    secondEntry.member.id,
    memberAuth.id,
  );
  // 12. Validate each history entry has required fields
  historyResponse.data.forEach((entry, index) => {
    TestValidator.predicate(
      `entry ${index + 1} has id`,
      () => entry.id !== undefined,
    );
    TestValidator.predicate(
      `entry ${index + 1} has createdAt`,
      () => entry.createdAt !== undefined,
    );
    TestValidator.predicate(
      `entry ${index + 1} has member`,
      () => entry.member !== undefined,
    );
    TestValidator.predicate(
      `entry ${index + 1} member has email`,
      () => entry.member.email !== undefined,
    );
  });
}
