import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

/**
 * Validate moderator refresh token failure scenarios: expired, revoked/rotated,
 * and invalid refresh tokens.
 *
 * Business context:
 *
 * - Moderators obtain access/refresh tokens on join/login. Refresh tokens should
 *   be validated for integrity, expiry, and binding to the user and device.
 *   Rotating a refresh token should invalidate previously issued refresh tokens
 *   when rotation semantics are applied.
 *
 * Test steps:
 *
 * 1. Create a moderator account via /auth/moderator/join and capture tokens.
 * 2. Expired-token variant: attempt refresh with an expired-looking token and
 *    assert the call fails.
 * 3. Revoked/rotated-token variant: use the initial refresh token to obtain new
 *    tokens (rotation), then re-use the original refresh token and assert it
 *    fails (simulating revocation via rotation).
 * 4. Invalid-token variant: attempt refresh with a malformed random token; on
 *    failure, inspect the error payload to ensure no sensitive fields are
 *    leaked (e.g., password/password_hash).
 */
export async function test_api_moderator_refresh_fails_with_expired_or_revoked_refresh_token(
  connection: api.IConnection,
) {
  // 1) Register a fresh moderator to obtain initial tokens
  const createBody = {
    username: `mod_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123!",
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const moderator: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(moderator);

  // Ensure token container exists
  TestValidator.predicate(
    "join returned refresh token",
    typeof moderator.token?.refresh === "string" &&
      moderator.token.refresh.length > 0,
  );

  const initialRefreshToken: string = moderator.token.refresh;

  // 2a) Expired-token variant: use an expired-token fixture and expect failure
  const expiredRefreshBody = {
    refresh_token: "00000000-expired-refresh-token",
  } satisfies ICommunityPortalModerator.IRefresh;

  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: expiredRefreshBody,
      });
    },
  );

  // 2b) Revoked/rotated-token variant: rotate using the initial token, then
  // re-use the original token and expect failure. Rotation semantics vary by
  // implementation; this test documents the expectation that rotation revokes
  // the previous token.
  const rotated: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPortalModerator.IRefresh,
    });
  typia.assert(rotated);

  // Attempt to reuse the original refresh token - should fail if rotation
  // invalidates old refresh tokens.
  await TestValidator.error(
    "reusing rotated refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies ICommunityPortalModerator.IRefresh,
      });
    },
  );

  // 2c) Invalid-token variant: use a random malformed token and inspect the
  // thrown HttpError for sensitive-data leakage.
  const invalidRefreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPortalModerator.IRefresh;

  try {
    await api.functional.auth.moderator.refresh(connection, {
      body: invalidRefreshBody,
    });
    // If no error thrown, fail the test assertion.
    TestValidator.predicate("invalid refresh token must not succeed", false);
  } catch (err) {
    // Ensure error is an HttpError and its message does not leak sensitive data
    if (err instanceof api.HttpError) {
      const json = err.toJSON();
      TestValidator.predicate(
        "error message must not leak sensitive fields",
        typeof json.message === "string" &&
          !String(json.message).toLowerCase().includes("password") &&
          !String(json.message).toLowerCase().includes("password_hash"),
      );
    } else {
      // Re-throw unexpected error types to surface test harness issues
      throw err;
    }
  }

  // Note: Cleanup and DB transaction rollback are assumed to be handled by
  // the test harness/environment. This test intentionally avoids touching
  // connection.headers directly; SDK manages Authorization headers.
}
