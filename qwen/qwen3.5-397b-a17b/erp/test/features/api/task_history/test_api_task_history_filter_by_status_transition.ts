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
 * Test filtering task history entries by specific status transitions.
 *
 * Validates the complete task history filtering functionality including status transition tracking, member-based filtering, and date range filtering. A member creates a project and task, then performs multiple status changes (open → in-progress → completed → closed) to generate diverse history entries. The test queries the history endpoint with various filter combinations to ensure accurate filtering behavior.
 *
 * Special attention is given to verifying that filtering by oldStatus and newStatus returns only matching transitions, memberId filtering correctly identifies the actor, and date range filtering respects the created_at timestamps. Combined filters are tested to ensure they work together correctly, and empty result scenarios are validated when no history entries match the criteria.
 *
 * 1. Member registers and authenticates to access project and task operations.
 * 2. Member creates a project to contain the task.
 * 3. Member creates a task within the project with initial status 'open'.
 * 4. Member updates task status multiple times: open → in-progress → completed → closed.
 * 5. Query history with oldStatus filter to retrieve entries where task had specific status before change.
 * 6. Query history with newStatus filter to retrieve entries where task transitioned to specific status.
 * 7. Query history with memberId filter to retrieve entries made by the specified member.
 * 8. Query history with date range filters (dateFrom, dateTo) to test temporal filtering.
 * 9. Query history with combined filters (oldStatus + newStatus) to test filter composition.
 * 10. Validate empty results when filters match no history entries.
 * 11. Validate pagination metadata accurately reflects filtered result count.
 */
export async function test_api_task_history_filter_by_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task with initial status 'open'
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 4. Update task status multiple times to generate history entries
  // Transition 1: open → in-progress
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
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Transition 2: in-progress → completed
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
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Transition 3: completed → closed
  const taskClosed =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          title: task.title,
          status: "closed",
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(taskClosed);
  // 5. Query all history entries (baseline)
  const allHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.equals("total history entries", allHistory.data.length, 3);
  TestValidator.equals("pagination records", allHistory.pagination.records, 3);
  // Verify the sequence of transitions
  TestValidator.equals(
    "first transition old status",
    allHistory.data[0].oldStatus,
    "open",
  );
  TestValidator.equals(
    "first transition new status",
    allHistory.data[0].newStatus,
    "in-progress",
  );
  TestValidator.equals(
    "second transition old status",
    allHistory.data[1].oldStatus,
    "in-progress",
  );
  TestValidator.equals(
    "second transition new status",
    allHistory.data[1].newStatus,
    "completed",
  );
  TestValidator.equals(
    "third transition old status",
    allHistory.data[2].oldStatus,
    "completed",
  );
  TestValidator.equals(
    "third transition new status",
    allHistory.data[2].newStatus,
    "closed",
  );
  // 6. Filter by oldStatus = "open" (should return 1 entry: open → in-progress)
  const historyByOldStatusOpen =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          oldStatus: "open",
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyByOldStatusOpen);
  TestValidator.equals(
    "oldStatus=open count",
    historyByOldStatusOpen.data.length,
    1,
  );
  TestValidator.equals(
    "oldStatus=open pagination records",
    historyByOldStatusOpen.pagination.records,
    1,
  );
  TestValidator.equals(
    "oldStatus=open entry old status",
    historyByOldStatusOpen.data[0].oldStatus,
    "open",
  );
  TestValidator.equals(
    "oldStatus=open entry new status",
    historyByOldStatusOpen.data[0].newStatus,
    "in-progress",
  );
  // 7. Filter by newStatus = "completed" (should return 1 entry: in-progress → completed)
  const historyByNewStatusCompleted =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          newStatus: "completed",
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyByNewStatusCompleted);
  TestValidator.equals(
    "newStatus=completed count",
    historyByNewStatusCompleted.data.length,
    1,
  );
  TestValidator.equals(
    "newStatus=completed pagination records",
    historyByNewStatusCompleted.pagination.records,
    1,
  );
  TestValidator.equals(
    "newStatus=completed entry old status",
    historyByNewStatusCompleted.data[0].oldStatus,
    "in-progress",
  );
  TestValidator.equals(
    "newStatus=completed entry new status",
    historyByNewStatusCompleted.data[0].newStatus,
    "completed",
  );
  // 8. Filter by memberId (should return all 3 entries since member made all changes)
  const historyByMemberId =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          memberId: memberAuth.id,
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyByMemberId);
  TestValidator.equals(
    "memberId filter count",
    historyByMemberId.data.length,
    3,
  );
  TestValidator.equals(
    "memberId filter pagination records",
    historyByMemberId.pagination.records,
    3,
  );
  // 9. Filter by combined oldStatus + newStatus (open → in-progress)
  const historyCombined =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          oldStatus: "open",
          newStatus: "in-progress",
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyCombined);
  TestValidator.equals("combined filter count", historyCombined.data.length, 1);
  TestValidator.equals(
    "combined filter pagination records",
    historyCombined.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter old status",
    historyCombined.data[0].oldStatus,
    "open",
  );
  TestValidator.equals(
    "combined filter new status",
    historyCombined.data[0].newStatus,
    "in-progress",
  );
  // 10. Filter by non-existent status combination (should return empty)
  const historyNonExistent =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          oldStatus: "closed",
          newStatus: "open",
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyNonExistent);
  TestValidator.equals(
    "non-existent filter count",
    historyNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent filter pagination records",
    historyNonExistent.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent filter pages",
    historyNonExistent.pagination.pages,
    0,
  );
  // 11. Filter by date range (dateFrom after all transitions - should return empty)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const historyFutureDate =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          dateFrom: futureDate.toISOString(),
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyFutureDate);
  TestValidator.equals(
    "future dateFrom count",
    historyFutureDate.data.length,
    0,
  );
  TestValidator.equals(
    "future dateFrom pagination records",
    historyFutureDate.pagination.records,
    0,
  );
  // 12. Filter by date range (dateTo before all transitions - should return empty)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const historyPastDate =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          dateTo: pastDate.toISOString(),
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyPastDate);
  TestValidator.equals("past dateTo count", historyPastDate.data.length, 0);
  TestValidator.equals(
    "past dateTo pagination records",
    historyPastDate.pagination.records,
    0,
  );
  // 13. Filter by date range encompassing all transitions (should return all 3)
  const historyDateRange =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          dateFrom: allHistory.data[0].createdAt,
          dateTo: allHistory.data[2].createdAt,
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(historyDateRange);
  TestValidator.predicate(
    "date range count",
    historyDateRange.data.length >= 1,
  );
  TestValidator.predicate(
    "date range pagination records",
    historyDateRange.pagination.records >= 1,
  );
  // 14. Validate member information in history entries
  for (const entry of allHistory.data) {
    TestValidator.equals(
      "history entry member id",
      entry.member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "history entry member email",
      entry.member.email,
      memberAuth.email,
    );
  }
}
