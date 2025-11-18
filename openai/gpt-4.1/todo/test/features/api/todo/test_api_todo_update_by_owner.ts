import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that a todo's owner can update the description and completion state
 * of their item, and that business rules for edit constraints are enforced.
 *
 * Test covers:
 *
 * 1. User registration/auth - create user context
 * 2. Create new todo as user
 * 3. Update description to a trimmed, new valid value and verify change
 * 4. Mark todo as completed, verify is_completed true and completed_at set
 * 5. Mark todo as incomplete, verify is_completed false and completed_at cleared
 *    (null)
 * 6. Confirm updated_at advances as expected
 * 7. Attempt to update with empty description -> expect error
 * 8. Attempt to update with too long description -> expect error Business
 *    validation: only the owner can reach this scenario; forbidden/permission
 *    test not required in this function.
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register/authenticate as new user
  const email = `${RandomGenerator.alphabets(10)}@example.com`;
  const password = RandomGenerator.alphaNumeric(10) + "1A";
  const joinBody = {
    email,
    password: password satisfies string as string,
    href: "https://test.com/register",
    referrer: "https://test.com/",
  } satisfies ITodoUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // Step 2: Create a todo as user
  const initialDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  }).trim();
  const todo = await api.functional.todo.user.todos.create(connection, {
    body: { description: initialDescription } satisfies ITodoTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals(
    "created description matches",
    todo.description,
    initialDescription,
  );
  TestValidator.predicate(
    "created todo incomplete",
    todo.is_completed === false &&
      (todo.completed_at === null || todo.completed_at === undefined),
  );

  // Step 3: update description with whitespace (should be trimmed)
  const updatedDescription = `  ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}  `;
  const trimmed = updatedDescription.trim();
  const updatedTodo = await api.functional.todo.user.todos.update(connection, {
    todoId: todo.id,
    body: { description: updatedDescription } satisfies ITodoTodo.IUpdate,
  });
  typia.assert(updatedTodo);
  TestValidator.equals(
    "trimmed description updated",
    updatedTodo.description,
    trimmed,
  );
  TestValidator.predicate(
    "updated_at advanced after editing description",
    updatedTodo.updated_at > todo.updated_at,
  );

  // Step 4: mark as completed
  const completedTodo = await api.functional.todo.user.todos.update(
    connection,
    {
      todoId: todo.id,
      body: { is_completed: true } satisfies ITodoTodo.IUpdate,
    },
  );
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo marked completed",
    completedTodo.is_completed,
    true,
  );
  TestValidator.predicate(
    "completed_at is set",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // Step 5: mark back as incomplete
  const incompleteTodo = await api.functional.todo.user.todos.update(
    connection,
    {
      todoId: todo.id,
      body: { is_completed: false } satisfies ITodoTodo.IUpdate,
    },
  );
  typia.assert(incompleteTodo);
  TestValidator.equals(
    "todo marked incomplete",
    incompleteTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at cleared",
    incompleteTodo.completed_at,
    null,
  );
  TestValidator.predicate(
    "updated_at advances after marking incomplete",
    incompleteTodo.updated_at > completedTodo.updated_at,
  );

  // Step 6: failure - empty description
  await TestValidator.error("rejects empty description", async () => {
    await api.functional.todo.user.todos.update(connection, {
      todoId: todo.id,
      body: { description: "   " } satisfies ITodoTodo.IUpdate,
    });
  });

  // Step 7: failure - overly long description (> 255 chars after trim)
  const tooLong = RandomGenerator.alphabets(260);
  await TestValidator.error("rejects too long description", async () => {
    await api.functional.todo.user.todos.update(connection, {
      todoId: todo.id,
      body: { description: tooLong } satisfies ITodoTodo.IUpdate,
    });
  });
}
