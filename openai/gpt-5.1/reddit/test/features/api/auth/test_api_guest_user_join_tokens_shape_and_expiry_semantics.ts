import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guest user join token structure and expiry semantics.
 *
 * This test exercises the public guestUser join endpoint and verifies that the
 * returned authorization envelope for a guestUser pseudo-account:
 *
 * - Conforms to the ICommunityPlatformGuestuser.IAuthorized DTO contract
 * - Provides a non-empty access token and refresh token
 * - Emits ISO 8601 date-time strings for token expiry fields
 * - Ensures refreshable_until is chronologically after expired_at
 * - Provides reasonable, positive lifetimes for access and refresh windows
 *
 * High-level steps:
 *
 * 1. Invoke POST /auth/guestUser/join via api.functional.auth.guestUser.join.
 * 2. Assert the response structure with typia.assert.
 * 3. Inspect the embedded IAuthorizationToken and verify:
 *
 *    - Access and refresh are non-empty strings
 *    - Expired_at and refreshable_until can be parsed as valid Date values
 *    - Expired_at is in the future relative to now
 *    - Refreshable_until is after expired_at and also in the future
 *    - Both expiry instants are not absurdly far away (bounded by a generous upper
 *         limit to catch misconfigurations).
 */
export async function test_api_guest_user_join_tokens_shape_and_expiry_semantics(
  connection: api.IConnection,
) {
  // 1. Call the guestUser join endpoint to obtain an authorized context.
  const authorized = await api.functional.auth.guestUser.join(connection);

  // 2. Structural and type-level assertion using typia.
  //    This guarantees that `authorized` matches
  //    ICommunityPlatformGuestuser.IAuthorized, including UUID and date-time
  //    format tags.
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(authorized);

  const token: IAuthorizationToken = authorized.token;

  // 3. Basic string presence checks for access and refresh tokens.
  TestValidator.predicate(
    "guestUser access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "guestUser refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 4. Parse expiry timestamps as Date instances.
  const now: Date = new Date();
  const expiredAt: Date = new Date(token.expired_at);
  const refreshableUntil: Date = new Date(token.refreshable_until);

  // Ensure date strings are parseable.
  TestValidator.predicate(
    "token.expired_at should be a valid date-time string",
    !Number.isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "token.refreshable_until should be a valid date-time string",
    !Number.isNaN(refreshableUntil.getTime()),
  );

  // 5. Semantic checks on token lifetime.
  const nowMs: number = now.getTime();
  const expiredAtMs: number = expiredAt.getTime();
  const refreshableUntilMs: number = refreshableUntil.getTime();

  // Access token must not already be expired.
  TestValidator.predicate(
    "guestUser access token should expire in the future",
    expiredAtMs > nowMs,
  );

  // Refresh token window must also be in the future.
  TestValidator.predicate(
    "guestUser refresh window should end in the future",
    refreshableUntilMs > nowMs,
  );

  // Refresh window must be strictly after access expiry to allow refreshes.
  TestValidator.predicate(
    "guestUser refreshable_until should be after expired_at",
    refreshableUntilMs > expiredAtMs,
  );

  // 6. Sanity bounds: ensure lifetimes are not absurdly long.
  const dayMs: number = 24 * 60 * 60 * 1000;
  const maxAccessLifetimeMs: number = 90 * dayMs; // 90 days
  const maxRefreshLifetimeMs: number = 180 * dayMs; // 180 days

  TestValidator.predicate(
    "guestUser access token lifetime should be within 90 days",
    expiredAtMs - nowMs <= maxAccessLifetimeMs,
  );
  TestValidator.predicate(
    "guestUser refresh token lifetime should be within 180 days",
    refreshableUntilMs - nowMs <= maxRefreshLifetimeMs,
  );
}
