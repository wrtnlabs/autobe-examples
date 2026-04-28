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
 * Test the full task status lifecycle to verify that each status transition is recorded in the task history audit trail.
 *
 * This test validates the complete task status workflow from creation through in-progress, completed, and closed states. Each status change generates a history entry that captures the transition details including old and new status values, timestamps, and the performing member.
 *
 * The test ensures that the task history audit trail is complete and accurate, maintaining proper chronological ordering of all status transitions. Special attention is given to verifying that the member information in each history entry matches the authenticated user who performed the updates.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a project for the task.
 * 3. Create a task with initial open status.
 * 4. Update task status to in-progress.
 * 5. Update task status to completed.
 * 6. Update task status to closed.
 * 7. Query task history and verify three entries are recorded.
 *
 * Validates:
 * - History contains exactly 3 entries for the three status transitions
 * - Each entry records correct old_status and new_status pairs
 * - First transition: open → in-progress
 * - Second transition: in-progress → completed
 * - Third transition: completed → closed
 * - Entries are ordered chronologically by created_at ascending
 * - Each entry includes the authenticated member who performed the change
 */
export async function test_api_task_update_status_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project);
  // 3. Create a task (initial status is "open" by default)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { status: "open" },
    },
  );
  typia.assert(task);
  TestValidator.equals("initial status is open", task.status, "open");
  // 4. Update task status: open → in-progress
  const bodyInProgress = {
    status: "in-progress",
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedTaskInProgress =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: bodyInProgress,
      },
    );
  typia.assert(updatedTaskInProgress);
  TestValidator.equals(
    "status changed to in-progress",
    updatedTaskInProgress.status,
    "in-progress",
  );
  // 5. Update task status: in-progress → completed
  const bodyCompleted = {
    status: "completed",
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedTaskCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: bodyCompleted,
      },
    );
  typia.assert(updatedTaskCompleted);
  TestValidator.equals(
    "status changed to completed",
    updatedTaskCompleted.status,
    "completed",
  );
  // 6. Update task status: completed → closed
  const bodyClosed = { status: "closed" } satisfies IHrmPlatformTask.IUpdate;
  const updatedTaskClosed =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: bodyClosed,
      },
    );
  typia.assert(updatedTaskClosed);
  TestValidator.equals(
    "status changed to closed",
    updatedTaskClosed.status,
    "closed",
  );
  // 7. Query task history and verify all three transitions
  const historyRequestBody = {} satisfies IHrmPlatformTaskHistory.IRequest;
  const history =
    await api.functional.hrmPlatform.member.projects.tasks._histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: historyRequestBody,
      },
    );
  typia.assert(history);
  // Validate pagination shows 3 records
  TestValidator.equals("history record count", history.pagination.records, 3);
  TestValidator.equals("data array length", history.data.length, 3);
  // Verify first transition: open → in-progress
  const firstEntry = history.data[0];
  typia.assert(firstEntry);
  TestValidator.equals(
    "first transition old status",
    firstEntry.old_status,
    "open",
  );
  TestValidator.equals(
    "first transition new status",
    firstEntry.new_status,
    "in-progress",
  );
  // Verify second transition: in-progress → completed
  const secondEntry = history.data[1];
  typia.assert(secondEntry);
  TestValidator.equals(
    "second transition old status",
    secondEntry.old_status,
    "in-progress",
  );
  TestValidator.equals(
    "second transition new status",
    secondEntry.new_status,
    "completed",
  );
  // Verify third transition: completed → closed
  const thirdEntry = history.data[2];
  typia.assert(thirdEntry);
  TestValidator.equals(
    "third transition old status",
    thirdEntry.old_status,
    "completed",
  );
  TestValidator.equals(
    "third transition new status",
    thirdEntry.new_status,
    "closed",
  );
  // Verify chronological ordering of timestamps
  TestValidator.predicate(
    "timestamps in ascending order",
    new Date(firstEntry.created_at).getTime() <=
      new Date(secondEntry.created_at).getTime() &&
      new Date(secondEntry.created_at).getTime() <=
        new Date(thirdEntry.created_at).getTime(),
  );
  // Verify member attribution - all transitions by same authenticated member
  TestValidator.equals(
    "first entry member matches authenticated user",
    firstEntry.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "second entry member matches authenticated user",
    secondEntry.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "third entry member matches authenticated user",
    thirdEntry.member.id,
    authorizedMember.id,
  );
}
