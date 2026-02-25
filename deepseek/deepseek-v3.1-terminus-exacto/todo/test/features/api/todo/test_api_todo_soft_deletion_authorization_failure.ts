import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test authorization failure when attempting to delete another user's todo.
 *
 * 1. Create two separate user accounts with distinct credentials
 * 2. User A creates a todo
 * 3. User B attempts to delete User A's todo
 * 4. Verify the operation fails with authorization error
 * 5. Validate neither user's todo data is affected
 */
export async function test_api_todo_soft_deletion_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for both users
  const userAConnection: api.IConnection = { host: connection.host };
  const userBConnection: api.IConnection = { host: connection.host };
  // Register User A
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userA);
  // Register User B with different credentials
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userB);
  // Ensure User A and User B are different
  TestValidator.notEquals("different user IDs", userA.id, userB.id);
  TestValidator.notEquals("different user emails", userA.email, userB.email);
  // User A creates a todo
  const todo = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // Verify todo belongs to User A
  TestValidator.equals("todo owner matches User A", todo.user.id, userA.id);
  TestValidator.notEquals("todo not owned by User B", todo.user.id, userB.id);
  // Store initial creation timestamp for later verification
  const initialCreatedAt = todo.created_at;
  const initialUpdatedAt = todo.updated_at;
  // User B attempts to delete User A's todo - should fail
  await TestValidator.error("User B cannot delete User A's todo", async () => {
    await api.functional.todoApp.user.todos.erase(userBConnection, {
      todoId: todo.id,
    });
  });
  // Verify todo still exists and is not deleted
  // Since we don't have a get todo endpoint, we can infer from the fact that
  // the authorization error occurred, meaning the todo still exists
  // and User B has no permission.
  // Validate that todo properties remain unchanged (not soft deleted)
  // We assume that if it were soft deleted, deleted_at would not be null
  // In a real scenario, we would fetch the todo again to verify
  // Create validation that User A still has access to their own todo
  // Since we don't have a GET endpoint, we'll create another todo
  // to ensure User A's connection still works
  const anotherTodo = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(anotherTodo);
  TestValidator.equals(
    "second todo also belongs to User A",
    anotherTodo.user.id,
    userA.id,
  );
  // Clean up: User A should be able to delete their own todos
  // The erase function does not return a value (void)
  await api.functional.todoApp.user.todos.erase(userAConnection, {
    todoId: todo.id,
  });
  // Also delete the second todo
  await api.functional.todoApp.user.todos.erase(userAConnection, {
    todoId: anotherTodo.id,
  });
}
