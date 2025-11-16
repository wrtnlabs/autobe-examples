import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that completed_at timestamp is accurately set when marking a todo as
 * complete.
 *
 * This test validates the accurate tracking of completion timestamps. A user
 * creates a todo at time T1, waits a measurable interval, marks it complete at
 * time T2, and the system should record completed_at at approximately T2 (not
 * T1). This ensures that completion time tracking is accurate and reflects when
 * the user actually marked the task complete, not when they created it.
 *
 * Steps:
 *
 * 1. Create and authenticate a user account
 * 2. Create a new todo item (completed_at should be null initially)
 * 3. Record the creation timestamp for comparison
 * 4. Wait a measurable time interval (500ms) to ensure time separation
 * 5. Mark the todo as complete via update endpoint
 * 6. Verify completed_at timestamp is set and is greater than created_at
 * 7. Verify completed_at is approximately at the time of marking complete, with
 *    reasonable tolerance
 */
export async function test_api_todo_update_completed_at_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
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

  // Step 2: Create a new todo item
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Verify that newly created todo has null completed_at
  TestValidator.equals(
    "newly created todo should have null completed_at",
    createdTodo.completed_at,
    null,
  );

  // Step 4: Record the creation timestamp for later comparison
  const createdAtTime = new Date(createdTodo.created_at).getTime();

  // Step 5: Wait a measurable time interval (500ms) to ensure time separation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 6: Mark the todo as complete
  const timeBeforeCompletion = Date.now();
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        is_completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    });
  const timeAfterCompletion = Date.now();
  typia.assert(updatedTodo);

  // Step 7: Verify that completed_at is now set
  TestValidator.predicate(
    "completed_at should be set after marking todo complete",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  // Step 8: Verify that completed_at is greater than created_at
  const completedAtTime = new Date(updatedTodo.completed_at!).getTime();
  TestValidator.predicate(
    "completed_at should be greater than created_at",
    completedAtTime > createdAtTime,
  );

  // Step 9: Verify that completed_at is approximately when the completion was marked
  // Allow 1000ms tolerance for server processing time and clock skew
  const tolerance = 1000;
  TestValidator.predicate(
    "completed_at timestamp should be approximately at completion time within tolerance",
    completedAtTime >= timeBeforeCompletion - tolerance &&
      completedAtTime <= timeAfterCompletion + tolerance,
  );

  // Step 10: Verify that there is meaningful time separation between creation and completion
  // Should be at least 400ms (we waited 500ms, accounting for some execution overhead)
  const timeDifference = completedAtTime - createdAtTime;
  TestValidator.predicate(
    "time between creation and completion should show measurable separation",
    timeDifference >= 400,
  );
}
