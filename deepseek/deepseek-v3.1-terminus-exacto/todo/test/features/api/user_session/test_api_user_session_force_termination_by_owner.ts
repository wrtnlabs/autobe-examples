import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that authenticated users can permanently delete their own sessions for
 * security purposes.
 *
 * This scenario validates the session deletion functionality including proper
 * authorization checks and prerequisite validation. The test verifies that
 * users can only delete sessions belonging to them and that the deletion
 * successfully removes all session data. Validate that prerequisite todo
 * creation requirements are met before session deletion can proceed. Test the
 * complete workflow from session creation through todo creation to session
 * termination, ensuring proper audit trail and security compliance.
 */
export async function test_api_user_session_force_termination_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: "", // Server will handle hashing
      status: "pending" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Authentication is now established via the join operation which sets headers

  // Step 2: Create a todo item to fulfill prerequisite requirement
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: todoData,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Create additional todo for complete prerequisite fulfillment
  const secondTodoData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITodoAppTodo.ICreate;

  const secondTodo = await api.functional.todos.create(connection, {
    body: secondTodoData,
  });
  typia.assert(secondTodo);

  // Step 4: Verify session information is available through todo relationships
  TestValidator.predicate(
    "todo should have user session information",
    createdTodo.userSession !== undefined && createdTodo.userSession !== null,
  );

  // Step 5: Extract session ID from the created todo
  const sessionId = typia.assert(createdTodo.userSession!.id);

  // Step 6: Perform session deletion
  await api.functional.todoApp.user.users.sessions.erase(connection, {
    userId: createdUser.id,
    sessionId: sessionId,
  });

  // Step 7: Verify session deletion by creating another todo with fresh session
  const thirdTodoData = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITodoAppTodo.ICreate;

  const thirdTodo = await api.functional.todoApp.user.todos.create(connection, {
    body: thirdTodoData,
  });
  typia.assert(thirdTodo);

  // Verify the new todo has a different session ID (new session created after deletion)
  TestValidator.notEquals(
    "new todo should have different session ID after deletion",
    thirdTodo.userSession?.id,
    sessionId,
  );

  // Step 8: Test authorization boundary - user cannot delete other users' sessions
  // Create a second user with fresh connection to avoid authentication conflicts
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = "anotherPassword456";

  const secondUserConnection: api.IConnection = { ...connection, headers: {} };

  const secondUser = await api.functional.auth.user.join(secondUserConnection, {
    body: {
      email: secondUserEmail,
      password: secondUserPassword,
      password_hash: "", // Server will handle hashing
      status: "pending" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Attempt to delete first user's session with second user's connection
  // This should fail due to authorization mismatch
  await TestValidator.error(
    "user cannot delete other user's session",
    async () => {
      await api.functional.todoApp.user.users.sessions.erase(
        secondUserConnection,
        {
          userId: createdUser.id, // First user's ID
          sessionId: sessionId, // Session belongs to first user
        },
      );
    },
  );

  // Step 9: Additional validation - ensure session deletion doesn't affect user functionality
  const fourthTodoData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITodoAppTodo.ICreate;

  const fourthTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: fourthTodoData,
    },
  );
  typia.assert(fourthTodo);

  TestValidator.predicate(
    "user should still be able to create todos after session deletion",
    fourthTodo.id !== undefined,
  );
}
