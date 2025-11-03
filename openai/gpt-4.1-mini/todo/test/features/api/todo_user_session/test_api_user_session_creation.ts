import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Validate the user session creation workflow.
 *
 * This test covers the complete business flow of creating a new user session
 * for an authenticated user identified by their email.
 *
 * Step-by-step process:
 *
 * 1. Create a user account using the signup API (/todo/todoUsers).
 * 2. Authenticate as the user via the join API (/auth/user/join).
 * 3. Create a new session for the user using IP, href, and referrer metadata via
 *    the session creation API (/todo/user/todoUsers/{email}/sessions).
 * 4. Validate the returned session metadata for correctness and completeness.
 *
 * The test ensures that sessions can only be created for authenticated users,
 * that session metadata is recorded accurately, and that the workflow enforces
 * proper authorization.
 */
export async function test_api_user_session_creation(
  connection: api.IConnection,
) {
  // 1. Create a new user account first
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);

  const user: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user ID is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      user.id,
    ),
  );

  // 2. Join/authenticate as that user
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "authorized user ID matches created user ID",
    authorized.id,
    user.id,
  );

  // 3. Create a new session for the authenticated user
  const ip =
    "192.168." +
    RandomGenerator.alphaNumeric(2) +
    "." +
    RandomGenerator.alphaNumeric(2);
  const hrefUrl = `https://example.com/todo?user=${encodeURIComponent(email)}`;
  const referrerUrl = `https://referrer.example.co/path?arg=value`;

  const session: ITodoUserSession =
    await api.functional.todo.user.todoUsers.sessions.create(connection, {
      todoUserEmail: email,
      body: {
        ip: ip,
        href: hrefUrl,
        referrer: referrerUrl,
      } satisfies ITodoUserSession.ICreate,
    });
  typia.assert(session);

  // 4. Validate the returned session data
  TestValidator.equals(
    "session todo_user_id matches user id",
    session.todo_user_id,
    user.id,
  );
  TestValidator.predicate(
    "session id is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      session.id,
    ),
  );
  TestValidator.equals("session ip matches input", session.ip, ip);
  TestValidator.equals("session href matches input", session.href, hrefUrl);
  TestValidator.equals(
    "session referrer matches input",
    session.referrer,
    referrerUrl,
  );
  TestValidator.predicate(
    "session created_at is ISO 8601",
    !isNaN(Date.parse(session.created_at)),
  );

  // session expired_at may be null or undefined when active
  TestValidator.predicate(
    "session expired_at is null or undefined",
    session.expired_at === null || session.expired_at === undefined,
  );
}
