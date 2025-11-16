import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_retrieval_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user (User1)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphabets(12);
  const user1: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user1Email,
        password: user1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user1);
  TestValidator.equals(
    "user1 authenticated successfully",
    user1.email,
    user1Email,
  );

  // Step 2: User1 creates a todo
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({ paragraphs: 1 });
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo created with correct title",
    todo.title,
    todoTitle,
  );
  TestValidator.equals("todo owner is user1", todo.todo_app_user_id, user1.id);

  // Step 3: Create and authenticate second user (User2)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphabets(12);
  const user2: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user2Email,
        password: user2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user2);
  TestValidator.equals(
    "user2 authenticated successfully",
    user2.email,
    user2Email,
  );

  // Step 4: User2 attempts to retrieve User1's todo and should fail
  await TestValidator.error("user2 cannot access user1 todo", async () => {
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: todo.id,
    });
  });
}
