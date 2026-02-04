import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_list_filtering_complete_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user);
  // Step 2: Create a mix of complete and incomplete todos
  const incompleteTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Incomplete Task 1",
        description: "This task should remain incomplete",
      },
    },
  );
  typia.assert(incompleteTodo);
  typia.assert(incompleteTodo.completion_status === false);
  const completeTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Complete Task 1",
        description: "This task should be marked complete",
      },
    },
  );
  typia.assert(completeTodo);
  typia.assert(completeTodo.completion_status === true);
  // Step 3: Test 'incomplete' filter
  const incompleteTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "incomplete",
      },
    },
  );
  typia.assert(incompleteTodos);
  TestValidator.equals(
    "only incomplete todos returned",
    incompleteTodos.data.length,
    1,
  );
  TestValidator.predicate(
    "todo is incomplete",
    () => incompleteTodos.data[0].completion_status === false,
  );
  // Step 4: Test 'complete' filter
  const completeTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "complete",
      },
    },
  );
  typia.assert(completeTodos);
  TestValidator.equals(
    "only complete todos returned",
    completeTodos.data.length,
    1,
  );
  TestValidator.predicate(
    "todo is complete",
    () => completeTodos.data[0].completion_status === true,
  );
  // Step 5: Test invalid filter defaults to 'all'
  const allTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: ("invalid-filter" as any) as "all" | "complete" | "incomplete" | undefined, // Cast to bypass type checking
      },
    },
  );
  typia.assert(allTodos);
  TestValidator.equals(
    "invalid filter defaults to all",
    allTodos.data.length,
    2,
  );
  // Step 6: Confirm data isolation
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user2);
  // User2 should see no todos from User1
  const user2Todos = await api.functional.todoApp.user.todos.index(
    user2Connection,
    {
      body: {
        status: "all",
      },
    },
  );
  typia.assert(user2Todos);
  TestValidator.equals(
    "user2 sees no todos from user1",
    user2Todos.data.length,
    0,
  );
}