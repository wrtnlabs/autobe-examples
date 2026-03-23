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
 * Test task history filtering capabilities with various criteria combinations.
 * 1. Authenticate member and create project
 * 2. Create multiple tasks with different statuses
 * 3. Update task statuses to generate varied history entries
 * 4. Test filtering by taskId
 * 5. Test filtering by dateRange
 * 6. Test filtering by oldStatus
 * 7. Test filtering by newStatus
 * 8. Test filtering by memberId
 * 9. Test combined filters (taskId + dateRange)
 * 10. Validate pagination works with filtered results
 */
export async function test_api_task_history_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
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
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create 3 tasks with different initial statuses
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "low",
      },
    },
  );
  typia.assert(task3);
  // 4. Update task statuses to create history entries
  // Task1: open -> in-progress -> completed
  await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
    taskId: task1.id,
    body: { status: "in-progress" } satisfies IHrmPlatformTask.IUpdate,
  });
  await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
    taskId: task1.id,
    body: { status: "completed" } satisfies IHrmPlatformTask.IUpdate,
  });
  // Task2: open -> in-progress -> closed
  await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
    taskId: task2.id,
    body: { status: "in-progress" } satisfies IHrmPlatformTask.IUpdate,
  });
  await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
    taskId: task2.id,
    body: { status: "closed" } satisfies IHrmPlatformTask.IUpdate,
  });
  // Task3: open -> completed
  await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
    taskId: task3.id,
    body: { status: "completed" } satisfies IHrmPlatformTask.IUpdate,
  });
  // 5. Test filter by taskId - should return only task1 history
  const filterByTaskId =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          taskId: task1.id,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterByTaskId);
  TestValidator.equals(
    "filter by taskId returns correct count",
    filterByTaskId.data.length,
    2,
  );
  TestValidator.equals(
    "all entries belong to task1",
    filterByTaskId.data.every((h) => h.task.id === task1.id),
    true,
  );
  // 6. Test filter by oldStatus - should return all transitions FROM "open"
  const filterByOldStatus =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          oldStatus: "open",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterByOldStatus);
  TestValidator.equals(
    "filter by oldStatus=open returns 3 entries",
    filterByOldStatus.data.length,
    3,
  );
  TestValidator.equals(
    "all entries have old_status=open",
    filterByOldStatus.data.every((h) => h.old_status === "open"),
    true,
  );
  // 7. Test filter by newStatus - should return all transitions TO "completed"
  const filterByNewStatus =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          newStatus: "completed",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterByNewStatus);
  TestValidator.equals(
    "filter by newStatus=completed returns 2 entries",
    filterByNewStatus.data.length,
    2,
  );
  TestValidator.equals(
    "all entries have new_status=completed",
    filterByNewStatus.data.every((h) => h.new_status === "completed"),
    true,
  );
  // 8. Test filter by memberId - should return all entries created by this member
  const filterByMemberId =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterByMemberId);
  TestValidator.equals(
    "filter by memberId returns all 5 entries",
    filterByMemberId.data.length,
    5,
  );
  TestValidator.equals(
    "all entries created by member",
    filterByMemberId.data.every((h) => h.member.id === member.id),
    true,
  );
  // 9. Test combined filters (taskId + oldStatus)
  const filterCombined =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          taskId: task2.id,
          oldStatus: "open",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterCombined);
  TestValidator.equals(
    "combined filter returns 1 entry",
    filterCombined.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter taskId matches",
    filterCombined.data[0].task.id,
    task2.id,
  );
  TestValidator.equals(
    "combined filter oldStatus matches",
    filterCombined.data[0].old_status,
    "open",
  );
  // 10. Test empty results with non-matching filter
  const filterEmpty =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          newStatus: "nonexistent-status",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterEmpty);
  TestValidator.equals(
    "non-matching filter returns empty array",
    filterEmpty.data.length,
    0,
  );
  // 11. Test pagination with filtered results
  const filterWithPagination =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {
          oldStatus: "open",
          page: 1,
          limit: 2,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filterWithPagination);
  TestValidator.equals(
    "pagination limit respected",
    filterWithPagination.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    filterWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filterWithPagination.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records",
    filterWithPagination.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages",
    filterWithPagination.pagination.pages,
    2,
  );
}
