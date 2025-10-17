import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_refresh_with_revoked_session_fails(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that a refresh attempt using an invalidated/rotated
   * refresh token is rejected. Because the SDK does not provide a
   * session-revoke endpoint, this test simulates revocation by performing a
   * legitimate refresh (which rotates the refresh token) and then attempting to
   * reuse the original refresh token. The server is expected to treat reuse of
   * a rotated token as invalid/suspicious and reject the attempt.
   *
   * Steps:
   *
   * 1. Create a moderator-capable account via POST /auth/moderator/join and
   *    capture the returned refresh token.
   * 2. Use that refresh token to call POST /auth/moderator/refresh to rotate the
   *    token (valid refresh). Capture the rotated refresh token.
   * 3. Attempt to reuse the original refresh token and assert the server rejects
   *    the call (error expected).
   * 4. As an additional verification, refresh using the rotated token (should
   *    succeed) to confirm normal rotation behavior.
   */

  // 1) Create moderator-capable user and capture initial refresh token
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!23",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const created: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Basic sanity checks
  TestValidator.predicate(
    "created response contains token",
    created.token !== undefined && typeof created.token.refresh === "string",
  );

  const initialRefreshToken: string = created.token.refresh;

  // 2) Perform a valid refresh using the initial refresh token to cause token rotation
  const rotated: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IEconPoliticalForumModerator.IRefresh,
    });
  typia.assert(rotated);

  TestValidator.notEquals(
    "rotated token differs from initial",
    rotated.token.refresh,
    initialRefreshToken,
  );

  // 3) Attempt to reuse the original (now-rotated) refresh token -> expect rejection
  await TestValidator.error(
    "reused refresh token must be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IEconPoliticalForumModerator.IRefresh,
      });
    },
  );

  // 4) Additional verification: new rotated token can be used to refresh again
  const rotatedAgain: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: rotated.token.refresh,
      } satisfies IEconPoliticalForumModerator.IRefresh,
    });
  typia.assert(rotatedAgain);

  TestValidator.notEquals(
    "second rotation produced another new refresh token",
    rotatedAgain.token.refresh,
    rotated.token.refresh,
  );

  // Cleanup: No direct deletion API available in the provided SDK. Tests
  // should rely on environment-level teardown (DB reset between tests) in CI.
}
