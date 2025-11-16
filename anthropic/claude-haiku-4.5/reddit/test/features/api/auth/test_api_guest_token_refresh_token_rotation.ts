import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token rotation behavior during refresh operations.
 *
 * This test validates the token refresh mechanism for guest accounts,
 * specifically testing whether token rotation is implemented to prevent token
 * reuse attacks.
 *
 * The test flow:
 *
 * 1. Create a guest account and obtain initial access and refresh tokens
 * 2. Call the refresh endpoint with the initial refresh token
 * 3. Verify that new tokens are issued (access token is always renewed)
 * 4. Determine if token rotation is implemented by comparing old and new refresh
 *    tokens
 * 5. If rotation is implemented, verify the old refresh token is invalidated
 * 6. If rotation is not implemented, verify the same refresh token persists for
 *    multiple refreshes
 */
export async function test_api_guest_token_refresh_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account and obtain initial tokens
  const initialGuest = await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  const initialAccessToken = initialGuest.token.access;
  const initialRefreshToken = initialGuest.token.refresh;

  TestValidator.predicate(
    "initial access token should be a non-empty string",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should be a non-empty string",
    initialRefreshToken.length > 0,
  );

  // Step 2: Call refresh endpoint with initial refresh token
  const refreshResponse1 = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshResponse1);

  const newAccessToken1 = refreshResponse1.token.access;
  const newRefreshToken1 = refreshResponse1.token.refresh;

  // Step 3: Verify new access token is issued
  TestValidator.notEquals(
    "new access token should differ from initial access token",
    newAccessToken1,
    initialAccessToken,
  );
  TestValidator.predicate(
    "new access token should be a non-empty string",
    newAccessToken1.length > 0,
  );

  // Step 4: Determine if token rotation is implemented
  const isTokenRotationImplemented = newRefreshToken1 !== initialRefreshToken;

  if (isTokenRotationImplemented) {
    // If rotation is implemented: test that old refresh token is invalidated
    TestValidator.notEquals(
      "new refresh token should differ from initial refresh token",
      newRefreshToken1,
      initialRefreshToken,
    );

    // Try to use the old refresh token - it should fail
    await TestValidator.error(
      "old refresh token should be invalidated after rotation",
      async () => {
        await api.functional.auth.guest.refresh(connection, {
          body: {
            refresh_token: initialRefreshToken,
          } satisfies ICommunityPlatformMember.IRefresh,
        });
      },
    );

    // Step 5: Verify new refresh token works for subsequent refresh
    const refreshResponse2 = await api.functional.auth.guest.refresh(
      connection,
      {
        body: {
          refresh_token: newRefreshToken1,
        } satisfies ICommunityPlatformMember.IRefresh,
      },
    );
    typia.assert(refreshResponse2);

    const newAccessToken2 = refreshResponse2.token.access;
    const newRefreshToken2 = refreshResponse2.token.refresh;

    TestValidator.notEquals(
      "second refresh should issue new access token",
      newAccessToken2,
      newAccessToken1,
    );
    TestValidator.notEquals(
      "second refresh should issue new refresh token",
      newRefreshToken2,
      newRefreshToken1,
    );

    TestValidator.predicate(
      "second refresh token should be valid",
      newRefreshToken2.length > 0,
    );
  } else {
    // If rotation is NOT implemented: verify same refresh token persists
    TestValidator.equals(
      "refresh token should remain the same after rotation",
      newRefreshToken1,
      initialRefreshToken,
    );

    // Step 6: Verify same refresh token can be reused for multiple refreshes
    const refreshResponse2 = await api.functional.auth.guest.refresh(
      connection,
      {
        body: {
          refresh_token: newRefreshToken1,
        } satisfies ICommunityPlatformMember.IRefresh,
      },
    );
    typia.assert(refreshResponse2);

    const newAccessToken2 = refreshResponse2.token.access;
    const newRefreshToken2 = refreshResponse2.token.refresh;

    TestValidator.notEquals(
      "second refresh should issue new access token",
      newAccessToken2,
      newAccessToken1,
    );
    TestValidator.equals(
      "second refresh token should still be the same",
      newRefreshToken2,
      initialRefreshToken,
    );

    // Perform a third refresh to further confirm token reuse
    const refreshResponse3 = await api.functional.auth.guest.refresh(
      connection,
      {
        body: {
          refresh_token: newRefreshToken2,
        } satisfies ICommunityPlatformMember.IRefresh,
      },
    );
    typia.assert(refreshResponse3);

    const newAccessToken3 = refreshResponse3.token.access;
    const newRefreshToken3 = refreshResponse3.token.refresh;

    TestValidator.notEquals(
      "third refresh should issue new access token",
      newAccessToken3,
      newAccessToken2,
    );
    TestValidator.equals(
      "third refresh token should still be the same",
      newRefreshToken3,
      initialRefreshToken,
    );
  }
}
