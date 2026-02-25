import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshot";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
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

export async function test_api_todo_history_snapshot_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAuth);
  // Create a todo to establish valid todo ID
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // NOTE: Since there are no history operations available in the provided utilities,
  // we need to simulate the scenario where snapshots would be created
  // For this test, we'll assume no snapshots exist for this todo
  // Search for snapshots with timestamp filters that ensure no results
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const pastDate = new Date("2000-01-01T00:00:00Z").toISOString(); // Distant past
  const emptyResult =
    await api.functional.todoApp.user.todos.histories.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(), // Random UUID
        body: {
          search_start: futureDate, // Future date that doesn't match any snapshots
          search_end: futureDate,
        } satisfies ITodoAppTodoHistorySnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Verify empty result set with proper pagination metadata
  TestValidator.equals("empty data array", emptyResult.data, []);
  TestValidator.equals("zero records", emptyResult.pagination.records, 0);
  TestValidator.equals("zero pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page 1", emptyResult.pagination.current, 1);
  TestValidator.predicate("positive limit", emptyResult.pagination.limit > 0);
  // Test with alternative timestamp filter that should also yield no results
  const alternativeEmptyResult =
    await api.functional.todoApp.user.todos.histories.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search_start: pastDate, // Past date before todo creation
          search_end: pastDate,
        } satisfies ITodoAppTodoHistorySnapshot.IRequest,
      },
    );
  typia.assert(alternativeEmptyResult);
  // Verify this also returns empty results
  TestValidator.equals(
    "alternative empty data array",
    alternativeEmptyResult.data,
    [],
  );
  TestValidator.equals(
    "alternative zero records",
    alternativeEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "alternative zero pages",
    alternativeEmptyResult.pagination.pages,
    0,
  );
}
