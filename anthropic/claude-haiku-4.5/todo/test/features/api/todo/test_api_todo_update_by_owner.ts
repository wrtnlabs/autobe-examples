import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify that an authenticated user can update their own todo item's mutable
 * fields.
 *
 * - Register and authenticate a new user.
 * - Create a todo item as that user.
 * - Update the todo's title, description, and completion status.
 * - Confirm only mutable fields were changed and audit fields updated
 *   accordingly.
 * - Validate completed_at changes when marking complete.
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinInput });
  typia.assert(userAuth);

  // Create a todo as this user
  const todoCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ITodoListTodo.ICreate;
  const origTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoCreateInput,
    });
  typia.assert(origTodo);

  // Save original audit fields for later comparison
  const origUpdatedAt = origTodo.updated_at;
  const origCompleted = origTodo.completed;
  const origCompletedAt = origTodo.completed_at;

  // Update the todo: change title, description, and completed status
  const updatedFields = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    completed: !origCompleted,
  } satisfies ITodoListTodo.IUpdate;
  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: origTodo.id,
      body: updatedFields,
    },
  );
  typia.assert(updatedTodo);

  // Mutable fields should update
  TestValidator.equals("title updated", updatedTodo.title, updatedFields.title);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedFields.description,
  );
  TestValidator.equals(
    "completed status updated",
    updatedTodo.completed,
    updatedFields.completed,
  );

  // System fields: id is unchanged
  TestValidator.equals("id unmodified", updatedTodo.id, origTodo.id);
  // created_at is unchanged
  TestValidator.equals(
    "created_at unmodified",
    updatedTodo.created_at,
    origTodo.created_at,
  );
  // updated_at must advance
  TestValidator.notEquals(
    "updated_at changed",
    updatedTodo.updated_at,
    origUpdatedAt,
  );

  // completed_at should update if marking complete; clear if marking incomplete
  if (updatedFields.completed) {
    TestValidator.predicate(
      "completed_at set when completed",
      !!updatedTodo.completed_at,
    );
  } else {
    TestValidator.equals(
      "completed_at cleared when incomplete",
      updatedTodo.completed_at,
      null,
    );
  }
}
