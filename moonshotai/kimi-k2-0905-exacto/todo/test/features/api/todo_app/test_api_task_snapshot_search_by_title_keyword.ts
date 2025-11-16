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
 * Test searching task snapshots by title keywords to find historical tasks
 * containing specific words or phrases. This test verifies partial matching
 * works correctly for locating historical snapshots with similar naming
 * patterns.
 *
 * Business Context:
 *
 * - Users need to find historical versions of tasks containing specific keywords
 * - Search supports partial matching for flexible query patterns
 * - Snapshots preserve task state at specific moments in time
 * - Filtering accuracy is essential for audit trail analysis
 *
 * Test Implementation:
 *
 * 1. Create authenticated user context via user registration
 * 2. Create multiple tasks with varied title patterns containing shared keywords
 * 3. Update tasks to generate historical snapshots with different title states
 * 4. Search snapshots using keywords from titles to test partial matching
 * 5. Validate search results contain only matching snapshots
 * 6. Verify pagination, sorting, and status filtering work correctly
 */
export async function test_api_task_snapshot_search_by_title_keyword(
  connection: api.IConnection,
) {
  // Step 1: Register a user to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    email: userEmail,
    password: "securepassword123",
    ip: "127.0.0.1",
    href: "https://test.com/home",
    referrer: "https://test.com/",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userData,
  });
  typia.assert(user);

  // Step 2: Create tasks with different title patterns containing common keywords
  const workTasks = await ArrayUtil.asyncRepeat(3, async (index) => {
    const taskData = {
      title: `${RandomGenerator.pick(["Complete", "Review", "Update"])} work assignment ${index + 1}`,
      description: {
        type: "full" as const,
        content: `Work task description for assignment ${index + 1}`.trim(),
      } as ITodoAppTaskDescription.IFull,
    } satisfies ITodoAppTask.ICreate;

    return await api.functional.todoApp.user.tasks.create(connection, {
      body: taskData,
    });
  });

  const personalTasks = await ArrayUtil.asyncRepeat(2, async (index) => {
    const taskData = {
      title: `${RandomGenerator.pick(["Personal", "Home"])} project ${index + 1}`,
      description: {
        type: "full" as const,
        content: `Personal task description for project ${index + 1}`,
      },
    } satisfies ITodoAppTask.ICreate;

    return await api.functional.todoApp.user.tasks.create(connection, {
      body: taskData,
    });
  });

  const urgentTasks = await ArrayUtil.asyncRepeat(2, async (index) => {
    const taskData = {
      title: `Urgent work ${RandomGenerator.pick(["deadline", "meeting", "review"])}${index + 1}`,
      description: {
        type: "full" as const,
        content: `Urgent task description ${index + 1}`,
      },
    } satisfies ITodoAppTask.ICreate;

    return await api.functional.todoApp.user.tasks.create(connection, {
      body: taskData,
    });
  });

  const allCreatedTasks = [...workTasks, ...personalTasks, ...urgentTasks];

  // Step 3: Update some tasks to create historical snapshots
  const updatedTasks = await ArrayUtil.asyncMap(
    allCreatedTasks.slice(0, 4),
    async (originalTask, index) => {
      const updatedTitle = `${originalTask.title} - Updated version ${index + 1}`;
      const updateData = {
        title: updatedTitle,
        description: `Updated description for version ${index + 1}`,
      } satisfies ITodoAppTask.IUpdate;

      return await api.functional.todoApp.user.tasks.update(connection, {
        taskId: originalTask.id,
        body: updateData,
      });
    },
  );

  // Step 4: Search snapshots by keyword "work" to test partial matching
  const workSearchRequest = {
    search: "work",
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "createdAt" as const,
    order: "desc" as const,
    status: "pending" as ITodoAppTaskStatus,
  } satisfies ITodoAppTaskSnapshot.IRequest;

  const workSearchResults =
    await api.functional.todoApp.user.taskSnapshots.index(connection, {
      body: workSearchRequest,
    });

  typia.assert(workSearchResults);
  TestValidator.equals(
    "work search has results",
    workSearchResults.data.length > 0,
    true,
  );

  // Step 5: Validate that results contain only snapshots with "work" in title
  for (const snapshot of workSearchResults.data) {
    TestValidator.predicate(
      "snapshot title contains 'work'",
      snapshot.title.toLowerCase().includes("work"),
    );
    TestValidator.predicate(
      "snapshot belongs to correct user",
      snapshot.user.id === user.id,
    );
  }

  // Step 6: Search by another keyword "personal" for additional verification
  const personalSearchRequest = {
    ...workSearchRequest,
    search: "personal",
  } satisfies ITodoAppTaskSnapshot.IRequest;

  const personalSearchResults =
    await api.functional.todoApp.user.taskSnapshots.index(connection, {
      body: personalSearchRequest,
    });

  typia.assert(personalSearchResults);
  TestValidator.equals(
    "personal search has results",
    personalSearchResults.data.length > 0,
    true,
  );

  // Validate personal search results
  for (const snapshot of personalSearchResults.data) {
    TestValidator.predicate(
      "snapshot title contains 'personal'",
      snapshot.title.toLowerCase().includes("personal"),
    );
  }

  // Step 7: Test partial word matching with "urg"
  const partialSearchRequest = {
    ...workSearchRequest,
    search: "urg",
  } satisfies ITodoAppTaskSnapshot.IRequest;

  const partialSearchResults =
    await api.functional.todoApp.user.taskSnapshots.index(connection, {
      body: partialSearchRequest,
    });

  typia.assert(partialSearchResults);
  TestValidator.equals(
    "partial search should find 'urgent' tasks",
    partialSearchResults.data.length > 0,
    true,
  );

  // Step 8: Verify pagination information
  TestValidator.equals(
    "pagination current page",
    workSearchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    workSearchResults.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    workSearchResults.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    workSearchResults.pagination.pages >= 1,
    true,
  );

  // Step 9: Test sorting with title search
  const titleSortRequest = {
    ...workSearchRequest,
    sort_by: "title" as const,
    order: "asc" as const,
  } satisfies ITodoAppTaskSnapshot.IRequest;

  const titleSortResults =
    await api.functional.todoApp.user.taskSnapshots.index(connection, {
      body: titleSortRequest,
    });

  typia.assert(titleSortResults);
  TestValidator.equals(
    "title sort has results",
    titleSortResults.data.length > 0,
    true,
  );

  // Validate title sorting worked correctly
  for (let i = 0; i < titleSortResults.data.length - 1; i++) {
    const current = titleSortResults.data[i].title.toLowerCase();
    const next = titleSortResults.data[i + 1].title.toLowerCase();
    TestValidator.predicate(
      `title sort order at ${i}: ${current} <= ${next}`,
      current <= next,
    );
  }

  // Step 10: Test no matching results scenario
  const noMatchRequest = {
    ...workSearchRequest,
    search: "nonexistentkeyword",
  } satisfies ITodoAppTaskSnapshot.IRequest;

  const noMatchResults = await api.functional.todoApp.user.taskSnapshots.index(
    connection,
    {
      body: noMatchRequest,
    },
  );

  typia.assert(noMatchResults);
  TestValidator.equals(
    "no match search returns empty",
    noMatchResults.data.length,
    0,
  );
}
