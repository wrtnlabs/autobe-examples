import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Global member logout flow: successful logout then enforced re-auth, with auth
 * boundary checks.
 *
 * This test validates that a member can globally log out of all sessions and
 * that subsequent protected calls require re-authentication. Because only join
 * and logoutAll endpoints are available, revocation is verified by attempting
 * the same protected endpoint (logoutAll) again after logout and asserting it
 * fails. It also validates that unauthenticated calls to logoutAll are
 * rejected.
 *
 * Steps:
 *
 * 1. Join as a member using IEconDiscussMember.ICreate and receive
 *    IEconDiscussMember.IAuthorized (SDK also sets Authorization header
 *    automatically on the provided connection).
 * 2. Call POST /auth/member/logoutAll successfully while authenticated.
 * 3. Attempt to call /auth/member/logoutAll again with the same connection; expect
 *    an error due to revoked session (no status code assertions).
 * 4. Create a new unauthenticated connection (empty headers) and call
 *    /auth/member/logoutAll; expect an error (auth boundary: unauthenticated is
 *    rejected).
 */
export async function test_api_session_logout_all_revokes_refresh_tokens(
  connection: api.IConnection,
) {
  // 1) Join to obtain an authenticated context and issued tokens
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars per DTO constraint
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: createBody,
  });
  typia.assert(authorized);

  // 2) Authenticated global logout should succeed
  await api.functional.auth.member.logoutAll(connection);

  // 3) Subsequent protected call should fail without re-authentication
  await TestValidator.error(
    "second logoutAll requires re-authentication after global logout",
    async () => {
      await api.functional.auth.member.logoutAll(connection);
    },
  );

  // 4) Auth boundary: unauthenticated call is rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated connection cannot call logoutAll",
    async () => {
      await api.functional.auth.member.logoutAll(unauthConn);
    },
  );
}
