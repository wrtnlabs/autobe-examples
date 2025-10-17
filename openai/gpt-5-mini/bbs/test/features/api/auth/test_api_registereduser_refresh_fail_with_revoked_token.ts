import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_refresh_fail_with_revoked_token(
  connection: api.IConnection,
) {
  /**
   * Scenario: Refresh fails when the session / refresh token has been revoked.
   *
   * Steps:
   *
   * 1. Create a new registered user via POST /auth/registeredUser/join and obtain
   *    initial tokens.
   * 2. Revoke all sessions for that user via POST
   *    /auth/registeredUser/sessions/revoke-all (called under the user's access
   *    context).
   * 3. Attempt to rotate the refresh token by calling POST
   *    /auth/registeredUser/refresh with the original refresh token.
   * 4. Expect an error (refresh should be rejected). Do not assert specific HTTP
   *    status codes; assert that an error is thrown.
   *
   * Notes:
   *
   * - Use only provided DTOs and SDK functions.
   * - Do NOT mutate connection.headers manually.
   * - Cleanup is left to external DB reset policies.
   */

  // 1) Create a new registered user (join)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-TEST-1234",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic token sanity checks
  TestValidator.predicate(
    "join returned access token string",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "join returned refresh token string",
    typeof authorized.token?.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  const originalRefreshToken: string = authorized.token.refresh;

  // 2) Revoke all sessions for the created user
  const revokeResult: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions(
      connection,
    );
  typia.assert(revokeResult);
  TestValidator.predicate(
    "revoke-all reported success",
    revokeResult.success === true,
  );

  // 3) Attempt to rotate using the original refresh token - expect error
  await TestValidator.error(
    "refresh with revoked token should be rejected",
    async () => {
      await api.functional.auth.registeredUser.refresh(connection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IEconPoliticalForumRegisteredUser.IRefresh,
      });
    },
  );

  // 4) Teardown note: No delete-user SDK function available. Test harness / CI should reset DB between tests.
}
