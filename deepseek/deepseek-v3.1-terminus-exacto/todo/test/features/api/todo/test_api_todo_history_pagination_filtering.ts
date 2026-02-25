import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple todos to generate enough history entries for pagination
  const todoCount = 15;
  const todos = await Promise.all(
    ArrayUtil.repeat(todoCount, (index) =>
      generate_random_todo_app_user_todos_create(userConnection, {
        body: {
          title: `Todo ${index + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        } satisfies ITodoAppTodo.ICreate,
      }),
    ),
  );
  todos.forEach((todo) => typia.assert(todo));
  // Use the first todo to test its history endpoint
  const testTodo = todos[0];
  // Test pagination with page 1, limit 5
  const page1Result = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: testTodo.id,
      body: {
        page: 1,
        limit: 5,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(page1Result);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has records",
    page1Result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "page 1 has valid pages",
    page1Result.pagination.pages >= 1,
  );
  TestValidator.equals("page 1 data count", page1Result.data.length, 5);
  // Test pagination with page 2, limit 5
  const page2Result = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: testTodo.id,
      body: {
        page: 2,
        limit: 5,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 has valid data count",
    page2Result.data.length >= 0 && page2Result.data.length <= 5,
  );
  // Test different limit sizes
  const largeLimitResult =
    await api.functional.todoApp.user.todos.histories.index(userConnection, {
      todoId: testTodo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit current page",
    largeLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit limit",
    largeLimitResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "large limit valid data count",
    largeLimitResult.data.length >= 0 && largeLimitResult.data.length <= 10,
  );
  // Test ascending order
  const ascendingResult =
    await api.functional.todoApp.user.todos.histories.index(userConnection, {
      todoId: testTodo.id,
      body: {
        page: 1,
        limit: 5,
        sort: "created_at",
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(ascendingResult);
  // Verify chronological ordering (oldest first for ascending) if we have multiple entries
  if (ascendingResult.data.length > 1) {
    TestValidator.predicate(
      "ascending order validation",
      new Date(ascendingResult.data[0].created_at) <=
        new Date(ascendingResult.data[1].created_at),
    );
  }
  // Verify all history entries belong to the correct todo and user
  page1Result.data.forEach((history, index) => {
    TestValidator.equals(
      `history ${index} todo id`,
      history.todo.id,
      testTodo.id,
    );
    TestValidator.equals(`history ${index} user id`, history.user.id, user.id);
    TestValidator.predicate(
      `history ${index} has valid created_at`,
      !isNaN(new Date(history.created_at).getTime()),
    );
  });
}
