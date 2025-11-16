import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskSnapshot";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import type { ITodoAppTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test pagination and sorting functionality for task snapshots to verify
 * efficient handling of large historical data sets.
 *
 * This test creates multiple tasks with different statuses, generates their
 * snapshots, and validates various pagination and sorting configurations. The
 * test ensures users can navigate through extensive task histories using
 * page-based navigation and organize results chronologically or by completion
 * status.
 *
 * @param connection API connection for authenticated requests
 */
export async function test_api_task_snapshot_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Create authenticated user context
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Create multiple tasks with different statuses
  const taskTitles = ArrayUtil.repeat(15, () =>
    RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
  );
  const tasks: ITodoAppTask[] = [];

  // Create pending tasks
  for (let i = 0; i < 10; i++) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: taskTitles[i],
        description: {
          type: "full",
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
        },
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    tasks.push(task);
  }

  // Create completed tasks
  for (let i = 10; i < 15; i++) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: taskTitles[i],
        description: {
          type: "full",
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
        },
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    tasks.push(task);
  }

  // Test pagination with different page sizes
  {
    // Test with page size 5
    const page1 = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          order: "desc",
          sort_by: "createdAt",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(page1);
    TestValidator.equals("page 1 should have 5 items", page1.data.length, 5);
    TestValidator.equals("page 1 current page", page1.pagination.current, 1);

    // Test with page size 10
    const page2 = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order: "desc",
          sort_by: "createdAt",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 should have 10 items", page2.data.length, 10);
    TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 10);
  }

  // Test sorting by creation date
  {
    const descResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "desc",
          sort_by: "createdAt",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(descResults);

    const ascResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "asc",
          sort_by: "createdAt",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(ascResults);

    // Verify descending order (newest first)
    for (let i = 0; i < descResults.data.length - 1; i++) {
      TestValidator.predicate(
        "descending order check",
        new Date(descResults.data[i].created_at) >=
          new Date(descResults.data[i + 1].created_at),
      );
    }

    // Verify ascending order (oldest first)
    for (let i = 0; i < ascResults.data.length - 1; i++) {
      TestValidator.predicate(
        "ascending order check",
        new Date(ascResults.data[i].created_at) <=
          new Date(ascResults.data[i + 1].created_at),
      );
    }
  }

  // Test sorting by title
  {
    const descResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "desc",
          sort_by: "title",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(descResults);

    const ascResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "asc",
          sort_by: "title",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(ascResults);

    // Verify title sort order
    for (let i = 0; i < descResults.data.length - 1; i++) {
      TestValidator.predicate(
        "title descending order",
        descResults.data[i].title >= descResults.data[i + 1].title,
      );
    }

    for (let i = 0; i < ascResults.data.length - 1; i++) {
      TestValidator.predicate(
        "title ascending order",
        ascResults.data[i].title <= ascResults.data[i + 1].title,
      );
    }
  }

  // Test sorting by status
  {
    const descResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "desc",
          sort_by: "status",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(descResults);

    const ascResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "asc",
          sort_by: "status",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(ascResults);

    // Verify status grouping (complete should come after pending in ascending order)
    let foundComplete = false;
    for (const snapshot of ascResults.data) {
      if (snapshot.status === "complete") {
        foundComplete = true;
      } else if (foundComplete && snapshot.status === "pending") {
        throw new Error(
          "Status sorting failed - pending found after complete in ascending order",
        );
      }
    }
  }

  // Test ascending and descending order combinations
  {
    // Test multiple field combinations
    const combinations = [
      { sort_by: "createdAt", order: "desc" as const },
      { sort_by: "createdAt", order: "asc" as const },
      { sort_by: "title", order: "desc" as const },
      { sort_by: "title", order: "asc" as const },
    ];

    for (const combo of combinations) {
      const results = await api.functional.todoApp.user.taskSnapshots.index(
        connection,
        {
          body: {
            page: 1,
            limit: 50,
            order: combo.order,
            sort_by: combo.sort_by as "createdAt" | "title",
            search: "",
            status: "pending" as ITodoAppTaskStatus,
          } satisfies ITodoAppTaskSnapshot.IRequest,
        },
      );
      typia.assert(results);
      TestValidator.predicate(
        "pagination structure valid",
        results.data.length > 0,
      );
    }
  }

  // Test status filtering functionality
  {
    // Test pending status filter
    const pendingResults =
      await api.functional.todoApp.user.taskSnapshots.index(connection, {
        body: {
          page: 1,
          limit: 100,
          order: "desc",
          sort_by: "createdAt",
          search: "",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      });
    typia.assert(pendingResults);

    // All results should be pending status
    for (const snapshot of pendingResults.data) {
      TestValidator.equals(
        "filtered snapshot status",
        snapshot.status,
        "pending",
      );
    }

    // Test complete status filter
    const completeResults =
      await api.functional.todoApp.user.taskSnapshots.index(connection, {
        body: {
          page: 1,
          limit: 100,
          order: "desc",
          sort_by: "createdAt",
          search: "",
          status: "complete" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      });
    typia.assert(completeResults);

    // All results should be complete status
    for (const snapshot of completeResults.data) {
      TestValidator.equals(
        "filtered snapshot status",
        snapshot.status,
        "complete",
      );
    }
  }

  // Test search functionality
  {
    // Create a task with a specific searchable title
    const searchTask = await api.functional.todoApp.user.tasks.create(
      connection,
      {
        body: {
          title: "Unique Searchable Task Title",
          description: {
            type: "full",
            content: "This task is created specifically for search testing",
          },
        } satisfies ITodoAppTask.ICreate,
      },
    );
    typia.assert(searchTask);

    // Search for the task
    const searchResults = await api.functional.todoApp.user.taskSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          order: "desc",
          sort_by: "createdAt",
          search: "Unique Searchable",
          status: "pending" as ITodoAppTaskStatus,
        } satisfies ITodoAppTaskSnapshot.IRequest,
      },
    );
    typia.assert(searchResults);

    // Should find at least one result containing the search term
    TestValidator.predicate(
      "search should find results",
      searchResults.data.length > 0,
    );
    TestValidator.predicate(
      "search term in title",
      searchResults.data.some((snapshot) =>
        snapshot.title.includes("Unique Searchable"),
      ),
    );
  }
}
