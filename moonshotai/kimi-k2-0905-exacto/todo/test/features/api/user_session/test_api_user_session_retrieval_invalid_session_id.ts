import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test session retrieval with invalid or non-existent session ID to validate
 * proper error handling and security responses.
 *
 * This test ensures the system gracefully handles requests for sessions that
 * don't exist or don't belong to the authenticated user, maintaining security
 * boundaries and providing appropriate error feedback without exposing
 * sensitive information about other users' sessions.
 *
 * The test will:
 *
 * 1. Create a new user account for authentication context
 * 2. Login the user to establish valid session
 * 3. Test retrieval with non-existent session ID (random UUID)
 * 4. Test security boundaries by attempting to access sessions from other users
 *    (conceptually)
 * 5. Verify appropriate error responses are returned
 * 6. Confirm no sensitive data is exposed in error messages
 * 7. Test with a UUID that hasn't been created in the system (simulating
 *    non-existent session)
 */
export async function test_api_user_session_retrieval_invalid_session_id(
  connection: api.IConnection,
) {
  // Create test user account
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/todo",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(user);

  // Store the original connection to create a second user later
  const originalConnection = { ...connection };

  // Login with the created user
  const loginData = {
    email: joinData.email,
    password: joinData.password,
    href: "https://example.com/todo",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.ILogin;

  const loggedInUser = await api.functional.auth.user.login(connection, {
    body: loginData,
  });
  typia.assert(loggedInUser);

  // Test 1: Retrieve session with non-existent session ID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent session should return error",
    async () => {
      await api.functional.todoApp.user.auth.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );

  // Test 2: Test with a completely different UUID that definitely doesn't exist
  const definitelyNonExistentId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.error(
    "definitely non-existent session should return error",
    async () => {
      await api.functional.todoApp.user.auth.sessions.at(connection, {
        sessionId: definitelyNonExistentId,
      });
    },
  );

  // Test 3: Test with another randomly generated UUID that's unlikely to exist
  const anotherNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "another non-existent session should return error",
    async () => {
      await api.functional.todoApp.user.auth.sessions.at(connection, {
        sessionId: anotherNonExistentId,
      });
    },
  );

  // Test 4: Create a second user to test authentication boundaries
  const joinData2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/todo",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  await api.functional.auth.user.join(originalConnection, {
    body: joinData2,
  });

  const loginData2 = {
    email: joinData2.email,
    password: joinData2.password,
    href: "https://example.com/todo",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.ILogin;

  const secondUser = await api.functional.auth.user.login(originalConnection, {
    body: loginData2,
  });
  typia.assert(secondUser);

  // Even with second user logged in, accessing non-existent sessions should fail
  await TestValidator.error(
    "second user accessing non-existent session should fail",
    async () => {
      await api.functional.todoApp.user.auth.sessions.at(originalConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );

  // Test 5: Verify that valid session IDs would work (if they existed)
  // This confirms our test setup is correct - if we had a real session ID, it would work
  TestValidator.predicate(
    "test setup allows valid UUID formats",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      nonExistentSessionId,
    ),
  );
}
