import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_update_partial_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Register a fresh user, create a todo, then partially update the todo (title
   *
   *   - Is_completed). Validate that only provided fields change, server-managed
   *       timestamps are updated, and completed_at is set when is_completed
   *       toggles to true.
   *
   * Notes:
   *
   * - The SDK does not provide a GET endpoint in the provided materials, so this
   *   test relies on the returned value from the update call to verify
   *   persistence and unchanged fields.
   */

  // 1) Register a fresh user (join). The SDK will attach Authorization token
  //    into connection.headers automatically.
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      // Use a randomized, valid password that meets MinLength<8>
      password: `P${RandomGenerator.alphaNumeric(7)}!`,
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2) Create a todo owned by the authenticated user
  const createBody = {
    title: `Initial Title ${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    position: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies ITodoAppTodo.ICreate;

  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: createBody,
  });
  typia.assert(todo);

  // Basic sanity checks on creation
  TestValidator.equals(
    "created todo title matches input",
    todo.title,
    createBody.title,
  );
  TestValidator.equals(
    "created todo description matches input",
    todo.description,
    createBody.description,
  );

  // 3) Partially update the todo: change title and mark completed
  const updateBody = {
    title: `Updated Title ${RandomGenerator.paragraph({ sentences: 2 })}`,
    is_completed: true,
  } satisfies ITodoAppTodo.IUpdate;

  const updated = await api.functional.todoApp.user.todos.update(connection, {
    todoId: todo.id,
    body: updateBody,
  });
  typia.assert(updated);

  // 4) Validations
  // - Updated fields
  TestValidator.equals(
    "updated title reflects request",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals(
    "is_completed toggled to true",
    updated.is_completed,
    true,
  );

  // - Unchanged fields must remain the same
  TestValidator.equals(
    "description unchanged after partial update",
    updated.description,
    todo.description,
  );
  TestValidator.equals(
    "position unchanged after partial update",
    updated.position,
    todo.position,
  );

  // - Timestamps: ensure strings are parseable, then compare
  const createdAtNum = Date.parse(todo.created_at);
  const updatedAtNum = Date.parse(updated.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !Number.isNaN(createdAtNum),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !Number.isNaN(updatedAtNum),
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAtNum >= createdAtNum,
  );

  // - completed_at should be present and not earlier than created_at when completed
  if (updated.is_completed === true) {
    TestValidator.predicate(
      "completed_at is present when item is completed",
      updated.completed_at !== null && updated.completed_at !== undefined,
    );
    if (updated.completed_at !== null && updated.completed_at !== undefined) {
      const completedAtNum = Date.parse(updated.completed_at);
      TestValidator.predicate(
        "completed_at is valid ISO date-time",
        !Number.isNaN(completedAtNum),
      );
      TestValidator.predicate(
        "completed_at is not earlier than created_at",
        completedAtNum >= createdAtNum,
      );
    }
  }
}
