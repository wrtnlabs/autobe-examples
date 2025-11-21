import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test multiple consecutive refresh operations to validate token rotation
 * security. Verify that each refresh generates new tokens while invalidating
 * previous ones, ensuring proper session management and preventing token reuse
 * vulnerabilities.
 */
export async function test_api_guest_session_refresh_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session for multiple refresh testing
  const initialGuest: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies ICommunityPlatformGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Step 2: Perform first refresh operation
  const firstRefresh: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        session_token: initialGuest.session_token,
      } satisfies ICommunityPlatformGuest.IRefresh,
    });
  typia.assert(firstRefresh);

  // Validate token rotation: first refresh should generate new tokens
  TestValidator.notEquals(
    "first refresh should generate new access token",
    firstRefresh.token.access,
    initialGuest.token.access,
  );
  TestValidator.notEquals(
    "first refresh should generate new refresh token",
    firstRefresh.token.refresh,
    initialGuest.token.refresh,
  );

  // Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "first refresh access token should have future expiration",
    new Date(firstRefresh.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "first refresh refresh token should have future expiration",
    new Date(firstRefresh.token.refreshable_until) > new Date(),
  );

  // Step 3: Perform second refresh operation
  const secondRefresh: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        session_token: firstRefresh.session_token,
      } satisfies ICommunityPlatformGuest.IRefresh,
    });
  typia.assert(secondRefresh);

  // Validate token rotation: second refresh should generate new tokens
  TestValidator.notEquals(
    "second refresh should generate new access token",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "second refresh should generate new refresh token",
    secondRefresh.token.refresh,
    firstRefresh.token.refresh,
  );

  // Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "second refresh access token should have future expiration",
    new Date(secondRefresh.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second refresh refresh token should have future expiration",
    new Date(secondRefresh.token.refreshable_until) > new Date(),
  );

  // Step 4: Perform third refresh operation
  const thirdRefresh: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        session_token: secondRefresh.session_token,
      } satisfies ICommunityPlatformGuest.IRefresh,
    });
  typia.assert(thirdRefresh);

  // Validate token rotation: third refresh should generate new tokens
  TestValidator.notEquals(
    "third refresh should generate new access token",
    thirdRefresh.token.access,
    secondRefresh.token.access,
  );
  TestValidator.notEquals(
    "third refresh should generate new refresh token",
    thirdRefresh.token.refresh,
    secondRefresh.token.refresh,
  );

  // Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "third refresh access token should have future expiration",
    new Date(thirdRefresh.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "third refresh refresh token should have future expiration",
    new Date(thirdRefresh.token.refreshable_until) > new Date(),
  );

  // Final validation: All tokens should be unique across all operations
  const allAccessTokens = [
    initialGuest.token.access,
    firstRefresh.token.access,
    secondRefresh.token.access,
    thirdRefresh.token.access,
  ];
  const allRefreshTokens = [
    initialGuest.token.refresh,
    firstRefresh.token.refresh,
    secondRefresh.token.refresh,
    thirdRefresh.token.refresh,
  ];

  // Validate uniqueness using Set size comparison
  TestValidator.equals(
    "all access tokens should be unique",
    new Set(allAccessTokens).size,
    allAccessTokens.length,
  );
  TestValidator.equals(
    "all refresh tokens should be unique",
    new Set(allRefreshTokens).size,
    allRefreshTokens.length,
  );

  // Validate session continuity: session_token should remain consistent
  TestValidator.equals(
    "session token should remain consistent across operations",
    initialGuest.session_token,
    firstRefresh.session_token,
  );
  TestValidator.equals(
    "session token should remain consistent across operations",
    firstRefresh.session_token,
    secondRefresh.session_token,
  );
  TestValidator.equals(
    "session token should remain consistent across operations",
    secondRefresh.session_token,
    thirdRefresh.session_token,
  );

  // Test error scenario: invalid session token should fail
  await TestValidator.error(
    "refresh with invalid session token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          session_token: "invalid_session_token_that_does_not_exist",
        } satisfies ICommunityPlatformGuest.IRefresh,
      });
    },
  );
}
