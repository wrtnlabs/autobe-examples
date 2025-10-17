import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Verify revoking a non-existent session id fails safely.
 *
 * Business purpose:
 *
 * - Ensure that attempting to revoke (DELETE) a session that does not exist does
 *   not silently succeed nor accidentally affect existing sessions.
 *
 * Test steps:
 *
 * 1. Register a new user via POST /auth/registeredUser/join and obtain an
 *    authorized response (IEconPoliticalForumRegisteredUser.IAuthorized). The
 *    SDK automatically sets the connection Authorization header from the
 *    returned token.
 * 2. Use a well-formed but random UUID as the target sessionId and call DELETE
 *    /auth/registeredUser/sessions/{sessionId}.
 * 3. Expect the operation to fail (server should return an error such as
 *    not-found). We assert that an error is thrown when attempting the
 *    revocation (we do not assert specific HTTP status codes here to follow
 *    general test-suite rules about not tightly coupling to a particular status
 *    number). Use TestValidator.error to ensure an error occurs.
 * 4. Confirm the originally returned authorized object remains a valid
 *    authorization payload (typia.assert) and that the token is present.
 *
 * Notes:
 *
 * - The test does NOT touch connection.headers directly.
 * - All request bodies are generated with typia.random<T>() and used as-is.
 */
export async function test_api_registereduser_revoke_session_not_found_for_invalid_id(
  connection: api.IConnection,
) {
  // 1) Register a new user (join) and obtain authorization
  const joinBody = typia.random<IEconPoliticalForumRegisteredUser.IJoin>();
  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Runtime type validation for the join response
  typia.assert(authorized);

  // 2) Attempt to revoke a non-existent session id
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "revoking a well-formed but non-existent session should fail",
    async () => {
      await api.functional.auth.registeredUser.sessions.revokeSession(
        connection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );

  // 3) Ensure the authorized payload remains valid and token exists
  typia.assert(authorized);
  TestValidator.predicate(
    "authorized token should still be present after failed revoke",
    () =>
      typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
}
