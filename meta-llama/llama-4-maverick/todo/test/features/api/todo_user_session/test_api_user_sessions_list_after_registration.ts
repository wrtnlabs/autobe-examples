import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Test retrieving user session list immediately after registration.
 *
 * Steps:
 *
 * 1. Register a new user with unique email, password, href, referrer, (optionally
 *    random IP)
 * 2. As the authenticated new user, list sessions via PATCH
 *    /todo/user/actors/me/sessions
 * 3. Assert that there is exactly one session in the returned page and it matches
 *    registration context
 * 4. Assert that the session's metadata (id, todo_user_id, ip, href, referrer,
 *    created_at, expired_at) are present
 * 5. Assert that expired_at is null or undefined (session is active)
 * 6. Assert that no sessions of other users are present
 */
export async function test_api_user_sessions_list_after_registration(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href:
      "https://test.nestia-session-list.me/" + RandomGenerator.alphaNumeric(8),
    referrer: "https://test.referrer.from/" + RandomGenerator.alphaNumeric(7),
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
      null,
      undefined,
    ]),
  } satisfies ITodoUser.ICreate;

  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userBody },
  );
  typia.assert(authorized);

  // 2. List user sessions with authenticated context
  const page: IPageITodoUserSession =
    await api.functional.todo.user.actors.me.sessions.index(connection, {
      body: {},
    });
  typia.assert(page);

  // 3. Assert single session exists (from registration)
  TestValidator.equals(
    "user sessions page should have exactly one session after registration",
    page.data.length,
    1,
  );

  const session = page.data[0];
  typia.assert(session);

  // 4. Metadata assertion
  TestValidator.equals(
    "session todo_user_id matches authorized.id",
    session.todo_user_id,
    authorized.id,
  );
  TestValidator.equals(
    "session href matches registration href",
    session.href,
    userBody.href,
  );
  TestValidator.equals(
    "session referrer matches registration referrer",
    session.referrer,
    userBody.referrer,
  );
  if (userBody.ip !== undefined && userBody.ip !== null) {
    TestValidator.equals(
      "session ip matches registration ip",
      session.ip,
      userBody.ip,
    );
  }

  // 5. Assert that session is active (not expired)
  TestValidator.equals(
    "session has no expired_at immediately after registration",
    session.expired_at,
    null,
  );

  // 6. Verify no sessions from any other users (redundancy: already ensured by API contract, but check anyway)
  TestValidator.equals(
    "session todo_user_id MUST match authorized user id",
    session.todo_user_id,
    authorized.id,
  );
}
