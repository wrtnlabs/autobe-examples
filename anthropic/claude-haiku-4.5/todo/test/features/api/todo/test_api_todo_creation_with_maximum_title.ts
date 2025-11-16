import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_with_maximum_title(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with exactly 255 characters title (maximum length)
  const maxTitle = RandomGenerator.alphabets(255);
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: maxTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Validate the created todo
  TestValidator.equals(
    "todo title length equals maximum constraint",
    todo.title.length,
    255,
  );
  TestValidator.equals("todo title matches input", todo.title, maxTitle);
  TestValidator.equals(
    "todo is not completed by default",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "todo belongs to authenticated user",
    todo.todo_app_user_id,
    user.id,
  );
}
