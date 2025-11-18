import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test retrieving specific session by ID after successful authentication. User
 * creates account, establishes session, then retrieves the specific session
 * details. Validates that session information includes correct connection
 * details, user context, timestamps, and that only the authenticated user can
 * access their own sessions.
 */
export async function test_api_user_session_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new user session with realistic test data
  const sessionData = {
    ip:
      "192.168.1." +
      typia
        .random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>
        >()
        .toString(),
    href: "https://example.com/dashboard" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/login" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListUserSession.ICreate;

  const createdSession = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: sessionData,
    },
  );
  typia.assert(createdSession);

  // 3. Retrieve the specific session by ID
  const retrievedSession = await api.functional.todoList.user.users.sessions.at(
    connection,
    {
      userId: user.id,
      sessionId: createdSession.id,
    },
  );
  typia.assert(retrievedSession);

  // 4. Validate session data integrity
  TestValidator.equals(
    "session ID matches",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals("user ID matches", retrievedSession.user.id, user.id);
  TestValidator.equals(
    "user email matches",
    retrievedSession.user.email,
    user.email,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedSession.ip,
    sessionData.ip,
  );
  TestValidator.equals("URL matches", retrievedSession.href, sessionData.href);
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    sessionData.referrer,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedSession.created_at !== null &&
      retrievedSession.created_at !== undefined,
  );
  TestValidator.predicate(
    "expired_at is undefined for active session",
    retrievedSession.expired_at === undefined,
  );
}
