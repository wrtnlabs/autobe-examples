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
 * Test filtering capabilities of task history endpoint with status and date range criteria.
 *
 * Validates that the task history audit trail can be filtered by old status, new status, and date range parameters. Creates a sequence of status transitions (open → in-progress → completed) to generate multiple history records, then verifies that status-based filters return only the matching transitions and that date range filters correctly narrow results to the specified time window.
 *
 * 1. Register and authenticate a member account
 * 2. Create a project within the member's organization
 * 3. Create a task that defaults to "open" status
 * 4. Update task status to "in-progress" to generate first history record
 * 5. Update task status to "completed" to generate second history record
 * 6. Fetch all history records to capture transition timestamps
 * 7. Filter by newStatus="completed" and verify only the completed transition is returned
 * 8. Filter by oldStatus="open" and verify only the open-to-in-progress transition is returned
 * 9. Apply date range filter and verify only transitions within the range are returned
 */
export async function test_api_task_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create task (defaults to "open" status)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {},
    },
  );
  typia.assert(task);
  TestValidator.equals("task default status", task.status, "open");
  // 4. Update task to in-progress
  const updateInProgress = {
    status: "in-progress",
  } satisfies IHrmPlatformTask.IUpdate;
  const taskInProgress =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: updateInProgress,
      },
    );
  typia.assert(taskInProgress);
  TestValidator.equals(
    "status changed to in-progress",
    taskInProgress.status,
    "in-progress",
  );
  // 5. Update task to completed
  const updateCompleted = {
    status: "completed",
  } satisfies IHrmPlatformTask.IUpdate;
  const taskCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: updateCompleted,
      },
    );
  typia.assert(taskCompleted);
  TestValidator.equals(
    "status changed to completed",
    taskCompleted.status,
    "completed",
  );
  // 6. Fetch all history to capture timestamps for date-range filtering
  const allHistory =
    await api.functional.hrmPlatform.member.projects.tasks._histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate(
    "has at least 2 history records",
    allHistory.data.length >= 2,
  );
  // Capture the second transition timestamp for date-range filtering
  const secondTransition = allHistory.data[1];
  // 7. Filter by newStatus="completed" - should return only the in-progress→completed transition
  const filteredByNewStatus =
    await api.functional.hrmPlatform.member.projects.tasks._histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          newStatus: "completed",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByNewStatus);
  TestValidator.equals(
    "filter by newStatus=completed count",
    filteredByNewStatus.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered new_status matches",
    filteredByNewStatus.data[0].new_status,
    "completed",
  );
  TestValidator.equals(
    "filtered old_status matches",
    filteredByNewStatus.data[0].old_status,
    "in-progress",
  );
  // 8. Filter by oldStatus="open" - should return only the open→in-progress transition
  const filteredByOldStatus =
    await api.functional.hrmPlatform.member.projects.tasks._histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { oldStatus: "open" } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByOldStatus);
  TestValidator.equals(
    "filter by oldStatus=open count",
    filteredByOldStatus.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered old_status matches",
    filteredByOldStatus.data[0].old_status,
    "open",
  );
  TestValidator.equals(
    "filtered new_status matches",
    filteredByOldStatus.data[0].new_status,
    "in-progress",
  );
  // 9. Filter by date range - only include transitions from secondTransition onward
  // Use secondTransition's created_at as startDate to exclude the first transition
  const filteredByDateRange =
    await api.functional.hrmPlatform.member.projects.tasks._histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          startDate: secondTransition.created_at,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  TestValidator.equals(
    "date range filter count",
    filteredByDateRange.pagination.records,
    1,
  );
  TestValidator.equals(
    "date range filtered new_status",
    filteredByDateRange.data[0].new_status,
    "completed",
  );
}
