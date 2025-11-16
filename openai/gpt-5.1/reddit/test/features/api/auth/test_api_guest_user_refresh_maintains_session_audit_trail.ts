import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guestUser refresh maintains guest identity and coherent
 * token/session semantics.
 *
 * Business intent:
 *
 * - A guest who has joined the platform should be able to refresh their
 *   authorization using the issued refresh token without changing the
 *   underlying guest identity.
 * - Each refresh should yield a structurally valid authorized payload and rotate
 *   access tokens, while keeping the guest id stable.
 * - Repeated refreshes should form a consistent temporal chain (timestamps should
 *   move forward or stay consistent, and deleted_at should remain null for
 *   active guests).
 * - Invalid or stale refresh tokens should result in an error at the business
 *   layer without violating TypeScript type safety.
 *
 * Scenario outline:
 *
 * 1. Perform an initial guest join via /auth/guestUser/join and capture the
 *    returned ICommunityPlatformGuestuser.IAuthorized payload.
 * 2. Use the returned refresh token to call /auth/guestUser/refresh once, then
 *    validate identity stability, timestamp consistency, and token rotation.
 * 3. Chain a second refresh from the first refresh's token and re-validate the
 *    same invariants across all three authorizations.
 * 4. Attempt a refresh with a clearly invalid refresh token to assert that the
 *    backend rejects it at runtime (business error) while maintaining strict
 *    compile-time type safety.
 */
export async function test_api_guest_user_refresh_maintains_session_audit_trail(
  connection: api.IConnection,
) {
  // 1. Initial guest join to obtain base authorization and refresh token
  const joinBody = {
    anonymous_handle: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.name(1),
    // leave ip undefined; server can infer it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const initialAuthorized = await api.functional.auth.guestUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(initialAuthorized);

  const guestId = initialAuthorized.id;
  const initialToken = initialAuthorized.token;

  // Basic invariants on initial payload
  TestValidator.predicate(
    "initial guest deleted_at is null or undefined",
    initialAuthorized.deleted_at === null ||
      initialAuthorized.deleted_at === undefined,
  );
  TestValidator.predicate(
    "initial updated_at is not earlier than created_at",
    initialAuthorized.updated_at >= initialAuthorized.created_at,
  );

  // 2. First refresh using initial refresh token
  const firstRefreshBody = {
    refreshToken: initialToken.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshed1 = await api.functional.auth.guestUser.refresh(connection, {
    body: firstRefreshBody,
  });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(refreshed1);

  TestValidator.equals(
    "guest id is stable on first refresh",
    refreshed1.id,
    guestId,
  );
  TestValidator.predicate(
    "guest deleted_at is still null after first refresh",
    refreshed1.deleted_at === null || refreshed1.deleted_at === undefined,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at after first refresh",
    refreshed1.updated_at >= refreshed1.created_at,
  );

  const token1 = refreshed1.token;

  // Access token should rotate on refresh (best-effort check)
  TestValidator.notEquals(
    "access token should rotate on first refresh",
    refreshed1.token.access,
    initialToken.access,
  );
  TestValidator.predicate(
    "refresh token after first refresh is non-empty",
    token1.refresh.length > 0,
  );

  // 3. Second refresh chained from first
  const secondRefreshBody = {
    refreshToken: token1.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshed2 = await api.functional.auth.guestUser.refresh(connection, {
    body: secondRefreshBody,
  });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(refreshed2);

  TestValidator.equals(
    "guest id is stable on second refresh",
    refreshed2.id,
    guestId,
  );

  // If account_status is present in both, ensure it remains stable across refreshes
  if (
    refreshed1.account_status !== undefined &&
    refreshed2.account_status !== undefined
  ) {
    TestValidator.equals(
      "account status remains stable across refreshes",
      refreshed2.account_status,
      refreshed1.account_status,
    );
  }

  TestValidator.predicate(
    "updated_at is monotonic across refreshes",
    refreshed2.updated_at >= refreshed1.updated_at,
  );

  const token2 = refreshed2.token;

  TestValidator.notEquals(
    "access token should rotate on second refresh",
    refreshed2.token.access,
    token1.access,
  );
  TestValidator.predicate(
    "refresh token after second refresh is non-empty",
    token2.refresh.length > 0,
  );

  // 5. Invalid refresh scenario with syntactically valid but logically wrong token
  await TestValidator.error(
    "invalid refresh token should cause business error",
    async () => {
      const invalidRefreshBody = {
        refreshToken: "invalid-refresh-token",
      } satisfies ICommunityPlatformGuestuser.IRefresh;

      await api.functional.auth.guestUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
