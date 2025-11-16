import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that refresh tokens are properly rotated during token refresh operations
 * to maintain security.
 *
 * This test validates the refresh token rotation mechanism by:
 *
 * 1. Creating an initial guest session with refresh token
 * 2. Performing a token refresh and verifying the refresh token is rotated
 * 3. Validating that the new refresh token works for subsequent operations
 * 4. Testing multiple refresh cycles to ensure consistent token rotation
 * 5. Verifying token expiration times are properly updated with each refresh
 */
export async function test_api_guest_refresh_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Register initial guest session
  const initialGuest = await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  const initialAccessToken = initialGuest.token.access;
  const initialRefreshToken = initialGuest.token.refresh;
  const initialExpiredAt = initialGuest.token.expired_at;
  const initialRefreshableUntil = initialGuest.token.refreshable_until;

  TestValidator.predicate(
    "initial access token should be a non-empty string",
    typeof initialAccessToken === "string" && initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should be a non-empty string",
    typeof initialRefreshToken === "string" && initialRefreshToken.length > 0,
  );

  // Step 2: Perform first token refresh
  const refreshedGuest = await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshedGuest);

  const newAccessToken = refreshedGuest.token.access;
  const newRefreshToken = refreshedGuest.token.refresh;
  const newExpiredAt = refreshedGuest.token.expired_at;
  const newRefreshableUntil = refreshedGuest.token.refreshable_until;

  // Step 3: Validate token rotation occurred
  TestValidator.notEquals(
    "refresh token should be rotated after refresh operation",
    initialRefreshToken,
    newRefreshToken,
  );

  TestValidator.notEquals(
    "access token should be updated after refresh operation",
    initialAccessToken,
    newAccessToken,
  );

  TestValidator.notEquals(
    "access token expiration should be updated",
    initialExpiredAt,
    newExpiredAt,
  );

  TestValidator.notEquals(
    "refresh token expiration should be updated",
    initialRefreshableUntil,
    newRefreshableUntil,
  );

  // Step 4: Verify new tokens have valid format and expiration
  TestValidator.predicate(
    "new access token should be a valid string",
    typeof newAccessToken === "string" && newAccessToken.length > 0,
  );

  TestValidator.predicate(
    "new refresh token should be a valid string",
    typeof newRefreshToken === "string" && newRefreshToken.length > 0,
  );

  TestValidator.predicate(
    "new expired_at should be a valid ISO datetime",
    typeof newExpiredAt === "string" && newExpiredAt.includes("T"),
  );

  TestValidator.predicate(
    "new refreshable_until should be a valid ISO datetime",
    typeof newRefreshableUntil === "string" &&
      newRefreshableUntil.includes("T"),
  );

  // Step 5: Verify new refresh token is functional through second refresh
  const secondRefresh = await api.functional.auth.guest.refresh(connection);
  typia.assert(secondRefresh);

  TestValidator.notEquals(
    "second refresh should produce a new refresh token",
    newRefreshToken,
    secondRefresh.token.refresh,
  );

  TestValidator.predicate(
    "second refresh token should be valid",
    typeof secondRefresh.token.refresh === "string" &&
      secondRefresh.token.refresh.length > 0,
  );

  // Step 6: Verify third refresh cycle continues token rotation
  const thirdRefresh = await api.functional.auth.guest.refresh(connection);
  typia.assert(thirdRefresh);

  TestValidator.notEquals(
    "third refresh should produce a new refresh token",
    secondRefresh.token.refresh,
    thirdRefresh.token.refresh,
  );

  TestValidator.notEquals(
    "third refresh should update access token",
    secondRefresh.token.access,
    thirdRefresh.token.access,
  );

  // Step 7: Verify expiration timestamps continue to update
  TestValidator.notEquals(
    "third refresh should update expired_at",
    secondRefresh.token.expired_at,
    thirdRefresh.token.expired_at,
  );

  TestValidator.notEquals(
    "third refresh should update refreshable_until",
    secondRefresh.token.refreshable_until,
    thirdRefresh.token.refreshable_until,
  );

  // Step 8: Verify final token state is valid
  TestValidator.predicate(
    "final access token should be valid",
    typeof thirdRefresh.token.access === "string" &&
      thirdRefresh.token.access.length > 0,
  );

  TestValidator.predicate(
    "final refresh token should be valid",
    typeof thirdRefresh.token.refresh === "string" &&
      thirdRefresh.token.refresh.length > 0,
  );
}
