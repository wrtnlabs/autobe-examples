import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that users cannot delete todos that belong to other users, enforcing
 * strict data isolation.
 *
 * This test validates the authorization enforcement of the todo deletion API.
 * Two users are registered: the first user creates a todo item, and the second
 * user attempts to delete it. The system should deny the unauthorized deletion
 * request with a permission error (403 Forbidden or 404 Not Found response).
 *
 * Test workflow:
 *
 * 1. Register first user (todo owner)
 * 2. Create a todo item as the first user
 * 3. Register second user (unauthorized user)
 * 4. Switch authentication to the second user
 * 5. Attempt to delete the todo owned by the first user
 * 6. Verify that the deletion is denied with an appropriate error response
 */
export async function test_api_todo_deletion_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Register first user who will own the todo item
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = RandomGenerator.alphabets(10);

  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUser);
  TestValidator.predicate(
    "first user registered successfully",
    firstUser.id !== null,
  );

  // Step 2: Create a todo item as the first user
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoBody,
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "todo created with correct owner",
    createdTodo.todo_app_user_id,
    firstUser.id,
  );

  // Step 3: Register second user (unauthorized user)
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = RandomGenerator.alphabets(10);

  const secondUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: secondUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUser);
  TestValidator.notEquals(
    "second user is different from first user",
    secondUser.id,
    firstUser.id,
  );

  // Step 4: Attempt to delete the todo owned by the first user
  // The second user's authentication token is now active (set by join call)
  await TestValidator.error(
    "second user cannot delete first user's todo",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: createdTodo.id,
      });
    },
  );
}
