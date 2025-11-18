import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_creation_with_required_fields_only(
  connection: api.IConnection,
) {
  /** Create a new user account and register it in the system. */
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const userResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/auth",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userResponse);

  /** Verify user was created with correct email. */
  TestValidator.equals(
    "user email matches registration",
    userResponse.email,
    email,
  );

  /** Create a todo with only the required title field. */
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const todoResponse: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: title,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoResponse);

  /** Verify all required fields are present in the created todo. */
  TestValidator.equals("todo title matches input", todoResponse.title, title);

  /** Verify default values are correctly initialized. */
  TestValidator.equals(
    "completion status defaults to false",
    todoResponse.completed,
    false,
  );
  TestValidator.equals(
    "priority defaults to medium",
    todoResponse.priority,
    "medium",
  );
  TestValidator.equals(
    "description is null when not provided",
    todoResponse.description,
    null,
  );
  TestValidator.equals(
    "due_date is null when not provided",
    todoResponse.due_date,
    null,
  );
  TestValidator.equals(
    "completed_at is null when not completed",
    todoResponse.completed_at,
    null,
  );

  /** Verify system-generated fields are assigned. */
  TestValidator.predicate(
    "todo has valid id",
    todoResponse.id !== null && todoResponse.id !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp is assigned",
    todoResponse.created_at !== null && todoResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is assigned",
    todoResponse.updated_at !== null && todoResponse.updated_at !== undefined,
  );
}
