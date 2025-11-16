import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_default_completion_status(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item with title and description
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Verify the todo has correct default completion status
  TestValidator.equals(
    "newly created todo should have is_completed set to false",
    todo.is_completed,
    false,
  );

  // Step 4: Verify completed_at is null for newly created todo
  TestValidator.equals(
    "newly created todo should have completed_at set to null",
    todo.completed_at,
    null,
  );

  // Step 5: Verify the todo belongs to the authenticated user
  TestValidator.equals(
    "todo user_id should match authenticated user id",
    todo.todo_app_user_id,
    user.id,
  );

  // Step 6: Verify the todo has required fields populated
  TestValidator.predicate(
    "todo title should not be empty",
    todo.title.length > 0,
  );

  TestValidator.predicate(
    "todo created_at should be a valid date",
    new Date(todo.created_at).getTime() > 0,
  );

  TestValidator.predicate(
    "todo updated_at should be a valid date",
    new Date(todo.updated_at).getTime() > 0,
  );

  // Step 7: Verify created_at and updated_at are the same for new todo
  TestValidator.equals(
    "newly created todo should have created_at equal to updated_at",
    todo.created_at,
    todo.updated_at,
  );
}
