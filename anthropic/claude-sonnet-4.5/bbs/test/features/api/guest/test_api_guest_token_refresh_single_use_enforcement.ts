import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that refresh tokens are single-use and properly invalidated after
 * successful refresh.
 *
 * This test validates the critical security requirement that refresh tokens can
 * only be used once and are properly invalidated after successful token
 * refresh, preventing refresh token replay attacks.
 *
 * Test Flow:
 *
 * 1. Create initial guest session to obtain refresh token
 * 2. Use the refresh token successfully to obtain new tokens (first refresh)
 * 3. Attempt to use the same original refresh token again (second refresh)
 * 4. Verify that the second refresh attempt fails with authentication error
 *
 * This confirms proper token rotation security - each refresh token can only be
 * used once, and attempting to reuse it will fail.
 */
export async function test_api_guest_token_refresh_single_use_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        session_identifier: typia.random<string & tags.Format<"uuid">>(),
        user_agent: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
        ip_address: null,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Store the original refresh token for replay testing
  const originalRefreshToken: string = initialGuest.token.refresh;

  // Step 2: First token refresh - should succeed
  const firstRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(firstRefresh);

  // Validate that first refresh returned new tokens (token rotation)
  TestValidator.predicate(
    "first refresh should return new refresh token different from original",
    firstRefresh.token.refresh !== originalRefreshToken,
  );

  // Validate guest identity remains consistent across token refresh
  TestValidator.equals(
    "guest ID should remain the same after token refresh",
    firstRefresh.id,
    initialGuest.id,
  );

  // Step 3: Second token refresh with SAME original token - should fail
  // This validates single-use token enforcement
  await TestValidator.error(
    "second refresh with already-used original token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
