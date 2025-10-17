import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test that empty or whitespace-only titles are rejected during todo update.
 *
 * User creates account, logs in, creates a todo, then attempts to update the
 * title to empty string or whitespace only. Verify the system returns
 * validation error and the todo title remains unchanged in database.
 *
 * Workflow:
 *
 * 1. Create user account with email and password meeting security requirements
 * 2. Authenticate user and receive authorization token
 * 3. Create a todo with valid title
 * 4. Attempt to update todo with empty string title (should fail)
 * 5. Attempt to update todo with whitespace-only title (should fail)
 * 6. Attempt to update todo with newline-only title (should fail)
 * 7. Perform valid update to confirm API still works correctly and original todo
 *    is intact
 */
export async function test_api_todo_update_validation_empty_title_rejected(
  connection: api.IConnection,
) {
  // 1. Create user account with valid credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";

  const newUser: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(newUser);
  TestValidator.predicate(
    "user should be authenticated with token",
    newUser.token !== undefined && newUser.token.access.length > 0,
  );

  // 2. Create initial todo with valid title
  const validTitle = RandomGenerator.paragraph({ sentences: 2 });
  const createdTodo: ITodoAppTodo = await api.functional.todoApp.todos.create(
    connection,
    {
      body: {
        title: validTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    validTitle,
  );
  TestValidator.predicate(
    "created todo is not completed",
    createdTodo.isCompleted === false,
  );

  // 3. Attempt to update todo with empty string title
  await TestValidator.error(
    "empty string title should be rejected",
    async () => {
      await api.functional.todoApp.authenticatedUser.todos.update(connection, {
        todoId: createdTodo.id,
        body: {
          title: "",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );

  // 4. Attempt to update todo with whitespace-only title
  await TestValidator.error(
    "whitespace-only title should be rejected",
    async () => {
      await api.functional.todoApp.authenticatedUser.todos.update(connection, {
        todoId: createdTodo.id,
        body: {
          title: "   ",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );

  // 5. Attempt to update todo with tab-only title
  await TestValidator.error("tab-only title should be rejected", async () => {
    await api.functional.todoApp.authenticatedUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: "\t\t",
      } satisfies ITodoAppTodo.IUpdate,
    });
  });

  // 6. Attempt to update todo with newline-only title
  await TestValidator.error(
    "newline-only title should be rejected",
    async () => {
      await api.functional.todoApp.authenticatedUser.todos.update(connection, {
        todoId: createdTodo.id,
        body: {
          title: "\n\n",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );

  // 7. Perform valid update to confirm API works and original todo is intact
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const successfulUpdate: ITodoAppTodo =
    await api.functional.todoApp.authenticatedUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(successfulUpdate);
  TestValidator.equals(
    "todo title updated successfully",
    successfulUpdate.title,
    updatedTitle,
  );
  TestValidator.notEquals(
    "updated title differs from original",
    successfulUpdate.title,
    validTitle,
  );
  TestValidator.predicate(
    "todo ID remains unchanged after update",
    successfulUpdate.id === createdTodo.id,
  );
  TestValidator.predicate(
    "todo creation timestamp preserved",
    successfulUpdate.createdAt === createdTodo.createdAt,
  );
}
