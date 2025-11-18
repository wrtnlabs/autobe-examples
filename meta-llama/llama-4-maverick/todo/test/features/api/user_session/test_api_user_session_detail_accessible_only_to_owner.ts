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
 * Validate that a user can retrieve full session details for their own session.
 *
 * This test registers a new user, retrieves the user's session list, and then
 * fetches the detail of a session by its id, verifying that all fields
 * correspond and data privacy is maintained. Steps:
 *
 * 1. Register a new user (random ITodoUser.ICreate data)
 * 2. Retrieve the current user's sessions (PATCH), obtain a session id
 * 3. Fetch the session's details by id (GET)
 * 4. Assert todo_user_id matches the registered user, and all key fields are
 *    present and match what is seen in the session list
 */
export async function test_api_user_session_detail_accessible_only_to_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user (random data)
  const userReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/signup",
    referrer: "https://google.com/",
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
  } satisfies ITodoUser.ICreate;
  const registered: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userReq },
  );
  typia.assert(registered);
  TestValidator.equals(
    "registered user email",
    registered.email,
    userReq.email,
  );

  // 2. List sessions for the user (should include at least one active session)
  const page: IPageITodoUserSession =
    await api.functional.todo.user.actors.me.sessions.index(connection, {
      body: {},
    });
  typia.assert(page);
  TestValidator.predicate("session list length >= 1", page.data.length >= 1);
  const session = page.data[0];
  typia.assert(session);

  // 3. Fetch session by id
  const detailed: ITodoUserSession =
    await api.functional.todo.user.actors.me.sessions.at(connection, {
      sessionId: session.id,
    });
  typia.assert(detailed);

  // 4. Assert fields match between listing and detail
  TestValidator.equals("session id", detailed.id, session.id);
  TestValidator.equals(
    "session owner matches registered user",
    detailed.todo_user_id,
    registered.id,
  );
  TestValidator.equals("ip matches", detailed.ip, session.ip);
  TestValidator.equals("href matches", detailed.href, session.href);
  TestValidator.equals("referrer matches", detailed.referrer, session.referrer);
  TestValidator.equals(
    "created_at matches",
    detailed.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "expired_at matches",
    detailed.expired_at,
    session.expired_at,
  );
}
