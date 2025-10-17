import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_revoke_all_sessions_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for: POST /auth/registeredUser/sessions/revoke-all
   *
   * Business goal:
   *
   * - Ensure a registered user can revoke all their active sessions so that
   *   previously issued access tokens are rejected afterwards.
   *
   * Implementation limitations and adaptations:
   *
   * - The provided SDK does not include a refresh endpoint or a listSessions
   *   endpoint. Therefore, this test validates revocation by asserting that
   *   previously issued access tokens stop working and that other users remain
   *   unaffected.
   */

  // 1) Prepare test data: unique username/email/password
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password12345!"; // satisfies server-side min length requirement
  const display_name = RandomGenerator.name();

  // 2) Create first connection to simulate device A (empty headers so SDK will set Authorization)
  const connA: api.IConnection = { ...connection, headers: {} };

  // 3) Register the new user (session #1 created)
  const joinBody = {
    username,
    email,
    password,
    display_name,
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const firstAuth = await api.functional.auth.registeredUser.join(connA, {
    body: joinBody,
  });
  typia.assert(firstAuth);

  // 4) Create second connection to simulate device B
  const connB: api.IConnection = { ...connection, headers: {} };

  // 5) Login to create a second session for the same user (session #2)
  const loginBody = {
    usernameOrEmail: username,
    password,
  } satisfies IEconPoliticalForumRegisteredUser.ILogin;

  const secondAuth = await api.functional.auth.registeredUser.login(connB, {
    body: loginBody,
  });
  typia.assert(secondAuth);

  // Basic sanity checks that both tokens are present
  TestValidator.predicate(
    "first access token exists",
    typeof firstAuth.token.access === "string" &&
      firstAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "second access token exists",
    typeof secondAuth.token.access === "string" &&
      secondAuth.token.access.length > 0,
  );

  // 6) Exercise: revoke all sessions with connA (must be authenticated)
  const revokeResp =
    await api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions(
      connA,
    );
  typia.assert(revokeResp);
  TestValidator.equals(
    "revokeAllSessions success flag",
    revokeResp.success,
    true,
  );

  // 7) Verification: attempts to use previously issued access tokens should be rejected.
  // We use connB (which still holds the second session's access token) to call a protected endpoint
  // and expect an error after revocation.
  await TestValidator.error(
    "previous access token should be rejected after revokeAllSessions",
    async () => {
      await api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions(
        connB,
      );
    },
  );

  // 8) Ensure other users are unaffected: create another user and confirm its token still works
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = "Password12345!";
  const connC: api.IConnection = { ...connection, headers: {} };

  const otherJoinBody = {
    username: otherUsername,
    email: otherEmail,
    password: otherPassword,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const otherAuth = await api.functional.auth.registeredUser.join(connC, {
    body: otherJoinBody,
  });
  typia.assert(otherAuth);

  // The other user's revokeAllSessions call should succeed (demonstrates other users unaffected)
  const otherRevoke =
    await api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions(
      connC,
    );
  typia.assert(otherRevoke);
  TestValidator.equals(
    "other user revokeAllSessions success",
    otherRevoke.success,
    true,
  );

  // 9) Notes: Cannot perform refresh-token verification or direct DB session table checks
  // because SDK does not provide refresh or listSessions endpoints. The test demonstrates
  // functional invalidation of access tokens and that other users remain unaffected.
}
