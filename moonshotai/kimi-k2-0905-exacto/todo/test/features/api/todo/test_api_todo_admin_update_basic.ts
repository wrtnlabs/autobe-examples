import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

/**
 * Validate that an admin can update an existing todo with valid changes.
 *
 * This test covers the workflow:
 *
 * 1. Register a new admin and authenticate.
 * 2. (Setup) The admin is assumed to have access to all todos, but since there is
 *    no admin create, we simulate with random uuid and random initial todo
 *    object (as backend would allow admin-level patch).
 * 3. The admin submits an update to the todo, changing both description and
 *    completion state.
 * 4. Assert that the returned todo reflects updates.
 * 5. Ensure timestamps update appropriately.
 */
export async function test_api_todo_admin_update_basic(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const joinInput = {
    email,
    password,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
    ip: undefined,
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(admin);

  // -- (simulate an existing todo for admin update: usually this would require a user-owned todo to be present)
  //     -- For E2E, we mock with random existing todo: in reality, this should come from a setup step or fixture
  const originalTodo: ITodoListTodo = typia.random<ITodoListTodo>();

  // 2. Define update payload
  const newDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 40,
  }); // short valid, unique
  const completed = !originalTodo.completed;
  const updateBody = {
    description: newDescription,
    completed,
  } satisfies ITodoListTodo.IUpdate;

  // 3. Admin updates the todo
  const updated: ITodoListTodo =
    await api.functional.todoList.admin.todos.update(connection, {
      todoId: originalTodo.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Description is updated
  TestValidator.equals(
    "todo description updated",
    updated.description,
    newDescription,
  );
  // 5. Completion state is toggled
  TestValidator.equals(
    "todo completed flag updated",
    updated.completed,
    completed,
  );

  // 6. updated_at is later than original
  TestValidator.predicate(
    "updated_at should be newer than before",
    new Date(updated.updated_at) > new Date(originalTodo.updated_at),
  );

  // 7. completed_at updated properly
  if (completed) {
    // If marked as complete, must be set
    TestValidator.predicate(
      "completed_at must be present when completed",
      updated.completed_at !== null && updated.completed_at !== undefined,
    );
    // If original was not completed or completed_at was null, must be newer
    if (
      originalTodo.completed_at !== null &&
      originalTodo.completed_at !== undefined
    ) {
      TestValidator.predicate(
        "completed_at updated or unchanged if already complete",
        new Date(updated.completed_at!) >= new Date(originalTodo.completed_at!),
      );
    }
  } else {
    // If marked as incomplete, must be null
    TestValidator.equals(
      "completed_at cleared when incomplete",
      updated.completed_at,
      null,
    );
  }
}
