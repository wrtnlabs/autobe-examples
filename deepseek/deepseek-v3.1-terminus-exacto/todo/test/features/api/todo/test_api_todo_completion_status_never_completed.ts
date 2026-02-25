import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoCompletion";
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

export async function test_api_todo_completion_status_never_completed(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://todoapp.com",
      referrer: "https://todoapp.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create todo item
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Get completion status for todo that never had completion changes
  const completionStatus =
    await api.functional.todoApp.user.todos.completion.current(userConnection, {
      todoId: todo.id,
    });
  typia.assert(completionStatus);
  // Validate default completion status is false (incomplete)
  TestValidator.equals(
    "completion status should be false for never-completed todo",
    completionStatus.completed,
    false,
  );
  // Validate timestamp is present and valid
  TestValidator.predicate(
    "completion status should have timestamp",
    () => !isNaN(new Date(completionStatus.created_at).getTime()),
  );
  // Validate that timestamp is reasonable (within last few seconds)
  const completionTime = new Date(completionStatus.created_at);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - completionTime.getTime());
  TestValidator.predicate(
    "completion timestamp should be recent",
    timeDiff < 10000,
  );
  // Validate ID is present and valid UUID
  TestValidator.predicate("completion status should have valid ID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      completionStatus.id,
    ),
  );
}
