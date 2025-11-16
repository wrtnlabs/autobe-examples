import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Ensure that a guest user session detail can only be retrieved when the
 * session actually exists, even if the caller is a valid, authorized guest
 * identity.
 *
 * Business focus
 *
 * - A valid guestUser (created via /auth/guestUser/join) should _not_ be able to
 *   fetch arbitrary sessionIds that are not present in
 *   `todo_app_guestuser_sessions`.
 * - The detail endpoint for sessions must distinguish between:
 *
 *   - Authorization success (valid guestUser JWT on the connection) and
 *   - Resource existence failure (no matching session for the given guestUserId +
 *       sessionId pair).
 * - The operation is read-only and must not create or mutate any rows when the
 *   session does not exist.
 *
 * Scenario steps
 *
 * 1. Call POST /auth/guestUser/join using ITodoAppGuestUserJoin.IRequest to obtain
 *    an ITodoAppGuestUser.IAuthorized payload.
 *
 *    - From the response, capture `authorized.guest.id` as `guestUserId`.
 *    - The SDK will automatically attach the issued access token to the connection
 *         headers, so subsequent calls run as this guestUser.
 * 2. Generate a random UUID value to be used as `sessionId` that is extremely
 *    unlikely to correspond to any real session row.
 * 3. Call GET /todoApp/guestUser/guestUsers/{guestUserId}/sessions/{sessionId}
 *    through `api.functional.todoApp.guestUser.guestUsers.sessions.at` with:
 *
 *    - `guestUserId` = the id from step 1
 *    - `sessionId` = the random UUID from step 2
 * 4. Use `TestValidator.error` with an async callback to assert that this call
 *    fails rather than returning an ITodoAppGuestUserSession.
 *
 *    - The test only checks that an error is thrown; it intentionally does not
 *         depend on a specific HTTP status code or error shape to avoid
 *         coupling to transport details.
 * 5. Because the endpoint is GET and documented as read-only, no explicit cleanup
 *    is necessary; the critical assertion is that a non-existent session cannot
 *    be read, even by a valid guestUser.
 */
export async function test_api_guestuser_session_detail_requires_existing_session(
  connection: api.IConnection,
) {
  // 1. Establish a valid guest user identity and session via auth join
  const joinBody = {
    // `href` and `referrer` must be valid URI strings per ITodoAppGuestUserJoin.IRequest
    href: "https://example.todo-app.test/landing",
    referrer: "https://example.todo-app.test/",
    // Optional context can be omitted or provided as simple strings
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    // Optional ip: provide a simple IPv4-like string; backend may normalize
    ip: "203.0.113.10",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  const guestUserId = authorized.guest.id;

  // 2. Generate a random UUID for a non-existent sessionId
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-4. Attempt to fetch the non-existent session and assert that it fails
  await TestValidator.error(
    "requesting a non-existent guest session should fail",
    async () => {
      // If this call unexpectedly succeeds, typia.assert ensures the
      // response matches ITodoAppGuestUserSession, but the TestValidator.error
      // wrapper will treat the lack of an exception as a test failure.
      const session: ITodoAppGuestUserSession =
        await api.functional.todoApp.guestUser.guestUsers.sessions.at(
          connection,
          {
            guestUserId,
            sessionId: nonExistentSessionId,
          },
        );
      typia.assert<ITodoAppGuestUserSession>(session);
    },
  );
}
