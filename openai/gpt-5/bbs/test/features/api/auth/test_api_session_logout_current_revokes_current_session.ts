import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Validate that logging out revokes the current authenticated session and that
 * unauthenticated logout attempts fail.
 *
 * Business context
 *
 * - Members join the platform and receive JWT tokens (access/refresh)
 *   encapsulated in IEconDiscussMember.IAuthorized.token.
 * - The SDK auto-injects Authorization on successful join. Logout targets the
 *   current session and returns void.
 *
 * Test steps
 *
 * 1. Join as a new member to obtain an authenticated context.
 *
 *    - Validate the authorization payload with typia.assert.
 * 2. Call POST /auth/member/logout with the authenticated connection.
 *
 *    - Expect success (void), no assertions beyond completion.
 * 3. Auth boundary: create an unauthenticated connection clone and call logout.
 *
 *    - Expect an error to be thrown (do not assert status code).
 */
export async function test_api_session_logout_current_revokes_current_session(
  connection: api.IConnection,
) {
  // 1) Join as a new member to obtain tokens and authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Optional consistency check: if subject snapshot provided, its id must match top-level id
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "subject.id should equal authorized.id",
      authorized.member.id,
      authorized.id,
    );
  }

  // 2) Logout with the authenticated connection (void return)
  await api.functional.auth.member.logout(connection);

  // 3) Auth boundary: logout without Authorization should error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated logout must be rejected",
    async () => {
      await api.functional.auth.member.logout(unauthConn);
    },
  );
}
