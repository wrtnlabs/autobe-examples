import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_response_structure(
  connection: api.IConnection,
) {
  // Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Create a todo item with title and description
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );

  // Validate complete response structure - typia.assert validates all types, formats, and constraints
  typia.assert(todo);

  // Validate business logic: title matches input
  TestValidator.equals("title matches input", todo.title, todoTitle);

  // Validate business logic: description matches input
  TestValidator.equals(
    "description matches input",
    todo.description,
    todoDescription,
  );

  // Validate business logic: is_completed is false on creation
  TestValidator.equals(
    "is_completed is false on creation",
    todo.is_completed,
    false,
  );

  // Validate business logic: completed_at is null on creation
  TestValidator.equals(
    "completed_at is null on creation",
    todo.completed_at,
    null,
  );

  // Validate business logic: created_at and updated_at match on creation
  TestValidator.equals(
    "created_at and updated_at match on creation",
    todo.created_at,
    todo.updated_at,
  );

  // Validate business logic: user id matches todo owner
  TestValidator.equals(
    "user id matches todo owner",
    todo.user.id,
    todo.todo_app_user_id,
  );

  // Validate business logic: user object has exactly 2 fields (id and email)
  const userKeys = Object.keys(todo.user);
  TestValidator.equals(
    "user object has exactly id and email fields",
    userKeys.length,
    2,
  );
}
