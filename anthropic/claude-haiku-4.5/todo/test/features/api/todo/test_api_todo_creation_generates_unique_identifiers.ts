import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_generates_unique_identifiers(
  connection: api.IConnection,
) {
  // Step 1: Create a new user for testing unique todo identifiers
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ICreate;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userCreateData,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos rapidly in succession
  const todoCount = 10;
  const todos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async () => {
      const todoData = {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 6,
        }),
      } satisfies ITodoAppTodo.ICreate;

      const createdTodo: ITodoAppTodo =
        await api.functional.todoApp.user.todos.create(connection, {
          body: todoData,
        });
      typia.assert(createdTodo);
      return createdTodo;
    },
  );

  // Step 3: Verify each todo has a valid UUID v4 format
  todos.forEach((todo, index) => {
    TestValidator.predicate(
      `todo ${index} has valid UUID v4 format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        todo.id,
      ),
    );
  });

  // Step 4: Verify all todo IDs are unique
  const todoIds = todos.map((todo) => todo.id);
  const uniqueIds = new Set(todoIds);
  TestValidator.equals(
    "all todo IDs are unique across multiple rapid creations",
    uniqueIds.size,
    todoIds.length,
  );
}
