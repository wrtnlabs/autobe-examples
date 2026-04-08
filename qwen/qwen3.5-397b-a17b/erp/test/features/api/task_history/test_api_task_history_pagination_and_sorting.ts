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
 * Test pagination and sorting functionality for task history retrieval.
 *
 * Validates the complete task history pagination and sorting system including default descending order, ascending order, limit-based pagination, page navigation, and metadata accuracy. Ensures that history entries are correctly ordered by created_at timestamp and that pagination metadata reflects the actual data distribution.
 *
 * Special attention is given to edge cases including requesting pages beyond available data (should return empty array with correct metadata) and minimum limit values (limit=1 should return single entry per page). The test verifies that total records count remains consistent regardless of pagination parameters.
 *
 * 1. Member authenticates and creates a project for testing.
 * 2. Member creates a task within the project with initial status.
 * 3. Member performs 15 status updates to generate sufficient history entries for pagination testing.
 * 4. Validates default sorting (descending by created_at, newest first).
 * 5. Validates ascending sort order (oldest first).
 * 6. Validates pagination with limit=5 across multiple pages.
 * 7. Validates edge case: limit=1 returns single entry per page.
 * 8. Validates edge case: requesting page beyond available pages returns empty data.
 * 9. Validates pagination metadata accuracy across all scenarios.
 */
export async function test_api_task_history_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
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
  // 3. Create task with initial status
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
  // 4. Generate 15 status updates to create history entries
  const statusSequence = [
    "in-progress",
    "completed",
    "open",
    "in-progress",
    "completed",
    "closed",
    "open",
    "in-progress",
    "completed",
    "open",
    "in-progress",
    "completed",
    "closed",
    "open",
    "in-progress",
  ] as const;
  for (const status of statusSequence) {
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          title: task.title,
          status,
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  }
  // 5. Test default sorting (descending - newest first)
  const defaultHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(defaultHistory);
  TestValidator.predicate(
    "default sort is descending (newest first)",
    defaultHistory.data.length >= 2,
  );
  TestValidator.predicate(
    "first entry is newer than second entry",
    defaultHistory.data.length < 2 ||
      defaultHistory.data[0].createdAt >= defaultHistory.data[1].createdAt,
  );
  TestValidator.equals(
    "pagination current page",
    defaultHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultHistory.pagination.limit, 20);
  // 6. Test ascending sort order (oldest first)
  const ascendingHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(ascendingHistory);
  TestValidator.predicate(
    "ascending sort: first entry is older than second",
    ascendingHistory.data.length < 2 ||
      ascendingHistory.data[0].createdAt <= ascendingHistory.data[1].createdAt,
  );
  TestValidator.equals(
    "total records matches descending",
    ascendingHistory.pagination.records,
    defaultHistory.pagination.records,
  );
  // 7. Test pagination with limit=5
  const page1Limit5 =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "page 1 limit 5 data length",
    page1Limit5.data.length,
    5,
  );
  TestValidator.equals("page 1 current", page1Limit5.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Limit5.pagination.limit, 5);
  const page2Limit5 =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: 2,
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(page2Limit5);
  TestValidator.equals(
    "page 2 limit 5 data length",
    page2Limit5.data.length,
    5,
  );
  TestValidator.equals("page 2 current", page2Limit5.pagination.current, 2);
  // 8. Test edge case: limit=1 returns single entry per page
  const limit1Page1 =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(limit1Page1);
  TestValidator.equals(
    "limit 1 page 1 data length",
    limit1Page1.data.length,
    1,
  );
  TestValidator.equals(
    "limit 1 pagination limit",
    limit1Page1.pagination.limit,
    1,
  );
  const limit1Page2 =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: 2,
          limit: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(limit1Page2);
  TestValidator.equals(
    "limit 1 page 2 data length",
    limit1Page2.data.length,
    1,
  );
  // 9. Test edge case: page beyond available pages returns empty data
  const totalPages = Math.ceil(defaultHistory.pagination.records / 5);
  const beyondPage = totalPages + 10;
  const emptyPage =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: beyondPage,
          limit: 5,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "beyond page returns empty data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current page",
    emptyPage.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page total records",
    emptyPage.pagination.records,
    defaultHistory.pagination.records,
  );
  // 10. Validate total records consistency across all queries
  TestValidator.equals(
    "page1Limit5 total records",
    page1Limit5.pagination.records,
    defaultHistory.pagination.records,
  );
  TestValidator.equals(
    "page2Limit5 total records",
    page2Limit5.pagination.records,
    defaultHistory.pagination.records,
  );
  TestValidator.equals(
    "limit1Page1 total records",
    limit1Page1.pagination.records,
    defaultHistory.pagination.records,
  );
  // 11. Validate pagination metadata accuracy
  const expectedPages = Math.ceil(defaultHistory.pagination.records / 5);
  TestValidator.equals(
    "page 1 total pages",
    page1Limit5.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Limit5.pagination.pages,
    expectedPages,
  );
  // 12. Verify chronological ordering across pages
  if (page1Limit5.data.length > 0 && page2Limit5.data.length > 0) {
    const lastPage1 = page1Limit5.data[page1Limit5.data.length - 1];
    const firstPage2 = page2Limit5.data[0];
    TestValidator.predicate(
      "page continuity: last of page1 >= first of page2",
      lastPage1.createdAt >= firstPage2.createdAt,
    );
  }
}
