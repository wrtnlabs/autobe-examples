import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test retrieval attempt for a todo item owned by a different user.
 *
 * Validates that users cannot access todos belonging to other users by
 * attempting to retrieve a todo created by a different authenticated user.
 * Verifies proper authorization checks and access denial for cross-user todo
 * access attempts.
 */
export async function test_api_todo_retrieval_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create first authenticated user context
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "password123",
      password_hash: "", // API will hash the password internally
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(firstUser);

  // Store first user's connection for later use
  const firstUserConnection = { ...connection };

  // Step 2: Create a todo item owned by the first user
  const firstUserTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(firstUserTodo);

  // Step 3: Create second authenticated user context
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
      password_hash: "", // API will hash the password internally
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Step 4: Attempt to retrieve the first user's todo using the second user's authentication
  // This should fail due to authorization checks
  await TestValidator.error(
    "second user cannot access first user's todo",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: firstUserTodo.id,
      });
    },
  );
}
