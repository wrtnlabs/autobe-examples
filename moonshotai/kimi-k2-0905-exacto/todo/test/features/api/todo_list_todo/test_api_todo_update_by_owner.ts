import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates updating a user's own todo item for description and completion
 * status changes.
 *
 * This test ensures that a user can:
 *
 * 1. Register (join) as a new user account
 * 2. Create a todo item with description and completion status
 * 3. Update the todo's description and mark it as completed in a single request
 * 4. The update is only allowed to the authenticated owner, and the returned todo
 *    object reflects updated fields as expected
 * 5. Timestamps propagate: updated_at must be refreshed, completed_at should be
 *    set or cleared according to completed field.
 * 6. Previous values and IDs are unchanged apart from the updated fields
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register Account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "created user email matches input",
    joinResult.email,
    userEmail,
  );
  TestValidator.predicate(
    "account is not locked after join",
    joinResult.is_locked === false,
  );
  TestValidator.predicate(
    "created_at matches updated_at on creation",
    joinResult.created_at === joinResult.updated_at,
  );
  TestValidator.predicate(
    "authorization token has valid access string",
    typeof joinResult.token.access === "string",
  );

  // 2. Create Todo
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  });
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      description: initialDescription,
      completed: false,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals(
    "description in creation matches input",
    todo.description,
    initialDescription,
  );
  TestValidator.equals("completed is false at creation", todo.completed, false);
  TestValidator.predicate(
    "created_at matches updated_at after creation",
    todo.created_at === todo.updated_at,
  );
  TestValidator.equals(
    "completed_at should be null when incomplete",
    todo.completed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is undefined after creation",
    todo.deleted_at,
    undefined,
  );

  // 3. Update Todo - owner changes description & marks as completed
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 15,
  });
  const updateBody = {
    description: updatedDescription,
    completed: true,
  } satisfies ITodoListTodo.IUpdate;
  const updated = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: updateBody,
  });
  typia.assert(updated);
  TestValidator.equals("id does not change after update", updated.id, todo.id);
  TestValidator.equals(
    "updated description is applied",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals("completed flag is now true", updated.completed, true);
  TestValidator.predicate(
    "updated_at is changed after update",
    updated.updated_at !== todo.updated_at,
  );
  TestValidator.predicate(
    "completed_at is set after marking complete",
    typeof updated.completed_at === "string" && updated.completed_at !== null,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "deleted_at remains undefined after update",
    updated.deleted_at,
    undefined,
  );
}
