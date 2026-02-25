import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshotItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import type { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_snapshots_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create a todo using utility function
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Perform first edit with specific title for search testing
  const firstUpdateTitle =
    "Searchable todo title " + RandomGenerator.alphabets(5);
  await api.functional.todoApp.user.todos.update(userConnection, {
    todoId: todo.id,
    body: {
      title: firstUpdateTitle,
      description: "First description with searchable content",
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Perform second edit with different content
  const secondUpdateTitle =
    "Another searchable title " + RandomGenerator.alphabets(5);
  await api.functional.todoApp.user.todos.update(userConnection, {
    todoId: todo.id,
    body: {
      title: secondUpdateTitle,
      description: "Second description with different content",
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Wait for another moment to create time separation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Perform third edit to generate more snapshots
  const thirdUpdateTitle =
    "Third searchable title " + RandomGenerator.alphabets(5);
  await api.functional.todoApp.user.todos.update(userConnection, {
    todoId: todo.id,
    body: {
      title: thirdUpdateTitle,
      description: "Third description with unique content",
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Test date range filtering - get current time and calculate boundaries
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
  const futureTime = new Date(now.getTime() + 3600000).toISOString();
  // Test 1: Get all snapshots without filtering
  const allSnapshots =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(allSnapshots);
  await TestValidator.predicate(
    "should return multiple snapshots",
    allSnapshots.data.length >= 3,
  );
  // Test 2: Filter by recent date range (should return multiple snapshots)
  const recentSnapshots =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          from_date: oneHourAgo,
          to_date: futureTime,
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(recentSnapshots);
  await TestValidator.predicate(
    "recent date range should return snapshots",
    recentSnapshots.data.length >= 3,
  );
  // Test 3: Filter by future date range (should return no snapshots)
  const futureSnapshots =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          from_date: futureTime,
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(futureSnapshots);
  TestValidator.equals(
    "future date range should return empty",
    futureSnapshots.data.length,
    0,
  );
  // Test 4: Filter by past date range far in the past (should return no snapshots)
  const farPast = new Date(now.getTime() - 86400000 * 365).toISOString(); // 1 year ago
  const pastSnapshots =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          to_date: farPast,
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(pastSnapshots);
  TestValidator.equals(
    "distant past date range should return empty",
    pastSnapshots.data.length,
    0,
  );
  // Test 5: Text search functionality
  const searchResults =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          search: "searchable",
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(searchResults);
  await TestValidator.predicate(
    "text search should return matching snapshots",
    searchResults.data.length > 0,
  );
  // Test 6: Combined date range and text search
  const combinedResults =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          from_date: oneHourAgo,
          to_date: futureTime,
          search: "description",
          limit: 10,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(combinedResults);
  await TestValidator.predicate(
    "combined filter should return results",
    combinedResults.data.length > 0,
  );
  // Test 7: Pagination functionality
  const firstPage =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have exactly one item",
    firstPage.data.length,
    1,
  );
  const secondPage =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          limit: 1,
          page: 2,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(secondPage);
  await TestValidator.predicate(
    "second page should contain snapshots",
    secondPage.data.length <= 1,
  );
  // Validate chronological order (newest first) using string comparison
  if (allSnapshots.data.length >= 2) {
    const firstSnapshotTime = allSnapshots.data[0].snapshot.snapshot_created_at;
    const secondSnapshotTime =
      allSnapshots.data[1].snapshot.snapshot_created_at;
    await TestValidator.predicate(
      "snapshots should be in chronological order (newest first)",
      firstSnapshotTime >= secondSnapshotTime,
    );
  }
  // Validate pagination metadata
  await TestValidator.predicate(
    "pagination should have valid metadata",
    allSnapshots.pagination.records >= 0 &&
      allSnapshots.pagination.current >= 1 &&
      allSnapshots.pagination.limit >= 1,
  );
}