import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that new todos are initialized with completion status set to false
 * (pending/incomplete).
 *
 * This test validates the default initialization of the completion status field
 * by creating multiple todos without specifying completion status and verifying
 * each is created with completed: false. This ensures the backend correctly
 * applies the default pending state to all newly created todos.
 *
 * Test workflow:
 *
 * 1. Authenticate user to establish session
 * 2. Create first todo without specifying completion status
 * 3. Verify first todo has completed: false
 * 4. Create second todo without specifying completion status
 * 5. Verify second todo has completed: false
 * 6. Create third todo with description but without completion status
 * 7. Verify third todo has completed: false
 */
export async function test_api_todo_creation_completion_status_default(
  connection: api.IConnection,
) {
  // 1. Authenticate user to establish session
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create first todo without specifying completion status
  const firstTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(firstTodo);

  // 3. Verify first todo has completed: false
  TestValidator.equals(
    "first todo completed status should be false",
    firstTodo.completed,
    false,
  );

  // 4. Create second todo without specifying completion status
  const secondTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(secondTodo);

  // 5. Verify second todo has completed: false
  TestValidator.equals(
    "second todo completed status should be false",
    secondTodo.completed,
    false,
  );

  // 6. Create third todo with description but without completion status
  const thirdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 6,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(thirdTodo);

  // 7. Verify third todo has completed: false
  TestValidator.equals(
    "third todo completed status should be false",
    thirdTodo.completed,
    false,
  );
}
