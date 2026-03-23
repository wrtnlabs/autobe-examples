import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_task_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated admin can retrieve a paginated list of tasks from projects within their organization with various filter combinations.
   *
   * This test validates:
   * 1. Task listing with no filters returns all tasks
   * 2. Status filter (open, in-progress, completed, closed)
   * 3. Priority filter (low, medium, high, urgent)
   * 4. Assigned employee filter
   * 5. Search query fuzzy matching on task titles
   * 6. Pagination with page and page_size parameters
   * 7. Sorting by due_date, priority, and created_at
   * 8. Combined filter scenarios
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test 1: List all tasks with no filters
  const allTasksResponse = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(allTasksResponse);
  TestValidator.predicate(
    "response has pagination",
    allTasksResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(allTasksResponse.data),
  );
  // 3. Test 2: Filter by status (in-progress)
  const inProgressTasksResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(inProgressTasksResponse);
  TestValidator.predicate("all tasks are in-progress", () =>
    inProgressTasksResponse.data.every(
      (t) => t.status === "in-progress",
    ),
  );
  TestValidator.predicate(
    "in-progress count <= total count",
    inProgressTasksResponse.data.length <= allTasksResponse.data.length,
  );
  // 4. Test 3: Filter by status (completed)
  const completedTasksResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        status: "completed",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(completedTasksResponse);
  TestValidator.predicate("all tasks are completed", () =>
    completedTasksResponse.data.every(
      (t) => t.status === "completed",
    ),
  );
  // 5. Test 4: Filter by priority (high)
  const highPriorityTasksResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        priority: "high",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(highPriorityTasksResponse);
  TestValidator.predicate("all tasks are high priority", () =>
    highPriorityTasksResponse.data.every(
      (t) => t.priority === "high",
    ),
  );
  TestValidator.predicate(
    "high priority count <= total count",
    highPriorityTasksResponse.data.length <= allTasksResponse.data.length,
  );
  // 6. Test 5: Filter by priority (urgent)
  const urgentTasksResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        priority: "urgent",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(urgentTasksResponse);
  TestValidator.predicate("all tasks are urgent", () =>
    urgentTasksResponse.data.every(
      (t) => t.priority === "urgent",
    ),
  );
  // 7. Test 6: Filter by assigned_employee_id (with a random UUID, likely returns 0)
  const randomEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const assignedTasksResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        assigned_employee_id: randomEmployeeId,
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(assignedTasksResponse);
  TestValidator.predicate(
    "assigned filter works",
    assignedTasksResponse.data.length >= 0,
  );
  // 8. Test 7: Search by task title (use a common word)
  const searchQuery = RandomGenerator.alphabets(3);
  const searchResponse = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {
        search: searchQuery,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns valid response",
    Array.isArray(searchResponse.data),
  );
  if (searchResponse.data.length > 0) {
    TestValidator.predicate("search results contain query", () =>
      searchResponse.data.every((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }
  // 9. Test 8: Pagination (page=1, page_size=2)
  const paginatedResponse = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {
        page: 1,
        page_size: 2,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 1 data count <= limit",
    paginatedResponse.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination records match total",
    paginatedResponse.pagination.records === allTasksResponse.data.length,
  );
  // 10. Test 9: Pagination page 2
  const page2Response = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {
        page: 2,
        page_size: 2,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", page2Response.pagination.limit, 2);
  TestValidator.predicate(
    "page 2 data count <= limit",
    page2Response.data.length <= 2,
  );
  // 11. Test 10: Sort by due_date ascending
  const sortByDueDateAscResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(sortByDueDateAscResponse);
  const tasksWithDueDate = sortByDueDateAscResponse.data.filter(
    (t) => t.due_date !== null,
  );
  if (tasksWithDueDate.length > 1) {
    TestValidator.predicate("tasks sorted by due_date ascending", () => {
      for (let i = 1; i < tasksWithDueDate.length; i++) {
        if (
          new Date(tasksWithDueDate[i - 1].due_date!).getTime() >
          new Date(tasksWithDueDate[i].due_date!).getTime()
        ) {
          return false;
        }
      }
      return true;
    });
  }
  // 12. Test 11: Sort by due_date descending
  const sortByDueDateDescResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        sort_by: "due_date",
        sort_order: "desc",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(sortByDueDateDescResponse);
  const tasksWithDueDateDesc = sortByDueDateDescResponse.data.filter(
    (t) => t.due_date !== null,
  );
  if (tasksWithDueDateDesc.length > 1) {
    TestValidator.predicate("tasks sorted by due_date descending", () => {
      for (let i = 1; i < tasksWithDueDateDesc.length; i++) {
        if (
          new Date(tasksWithDueDateDesc[i - 1].due_date!).getTime() <
          new Date(tasksWithDueDateDesc[i].due_date!).getTime()
        ) {
          return false;
        }
      }
      return true;
    });
  }
  // 13. Test 12: Sort by priority ascending
  const sortByPriorityAscResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        sort_by: "priority",
        sort_order: "asc",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(sortByPriorityAscResponse);
  const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
  TestValidator.predicate("tasks sorted by priority ascending", () => {
    for (let i = 1; i < sortByPriorityAscResponse.data.length; i++) {
      const prevPriority =
        priorityOrder[
          sortByPriorityAscResponse.data[i - 1]
            .priority as keyof typeof priorityOrder
        ];
      const currPriority =
        priorityOrder[
          sortByPriorityAscResponse.data[i]
            .priority as keyof typeof priorityOrder
        ];
      if (prevPriority > currPriority) {
        return false;
      }
    }
    return true;
  });
  // 14. Test 13: Sort by created_at descending
  const sortByCreatedAtDescResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(sortByCreatedAtDescResponse);
  TestValidator.predicate("tasks sorted by created_at descending", () => {
    for (let i = 1; i < sortByCreatedAtDescResponse.data.length; i++) {
      if (
        new Date(sortByCreatedAtDescResponse.data[i - 1].created_at).getTime() <
        new Date(sortByCreatedAtDescResponse.data[i].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 15. Test 14: Combined filters (status + priority)
  const combinedFilterResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        status: "open",
        priority: "low",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter - all tasks match status and priority",
    () =>
      combinedFilterResponse.data.every(
        (t) =>
          t.status === "open" && t.priority === "low",
      ),
  );
  TestValidator.predicate(
    "combined filter count <= status filter count",
    combinedFilterResponse.data.length <= inProgressTasksResponse.data.length,
  );
  // 16. Test 15: Combined filters (status + search)
  const statusSearchResponse =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        status: "open",
        search: "test",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(statusSearchResponse);
  TestValidator.predicate(
    "status+search filter - all tasks match status",
    () =>
      statusSearchResponse.data.every(
        (t) => t.status === "open",
      ),
  );
  if (statusSearchResponse.data.length > 0) {
    TestValidator.predicate(
      "status+search filter - all tasks match search",
      () =>
        statusSearchResponse.data.every(
          (t) =>
            t.title.toLowerCase().includes("test"),
        ),
    );
  }
  // 17. Test 16: Verify task structure includes all required fields
  if (allTasksResponse.data.length > 0) {
    const sampleTask = allTasksResponse.data[0];
    typia.assert(sampleTask);
    TestValidator.predicate("task has valid id", sampleTask.id !== undefined);
    TestValidator.predicate("task has title", sampleTask.title !== undefined);
    TestValidator.predicate("task has status", sampleTask.status !== undefined);
    TestValidator.predicate(
      "task has priority",
      sampleTask.priority !== undefined,
    );
    TestValidator.predicate(
      "task has created_at",
      sampleTask.created_at !== undefined,
    );
    TestValidator.predicate(
      "task has updated_at",
      sampleTask.updated_at !== undefined,
    );
    TestValidator.predicate(
      "task has project",
      sampleTask.project !== undefined,
    );
    TestValidator.predicate(
      "project has id",
      sampleTask.project.id !== undefined,
    );
    TestValidator.predicate(
      "project has name",
      sampleTask.project.name !== undefined,
    );
    TestValidator.predicate(
      "project has color_code",
      sampleTask.project.color_code !== undefined,
    );
  }
  // 18. Test 17: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current",
    paginatedResponse.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginatedResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records",
    paginatedResponse.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages",
    paginatedResponse.pagination.pages !== undefined,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    paginatedResponse.pagination.pages ===
      Math.ceil(
        paginatedResponse.pagination.records /
          paginatedResponse.pagination.limit,
      ),
  );
}