import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test optional refresh token rotation mechanism for enhanced security.
 *
 * This test validates that the guest token refresh endpoint implements proper
 * token rotation by issuing both a new access token and a new refresh token on
 * each refresh, while invalidating the old refresh token to prevent reuse
 * attacks.
 *
 * Test workflow:
 *
 * 1. Create initial guest session with token pair
 * 2. Perform first token refresh
 * 3. Verify new access and refresh tokens are returned
 * 4. Attempt to reuse old refresh token (should fail)
 * 5. Verify old refresh token is rejected
 * 6. Use new refresh token successfully
 *
 * Security validation:
 *
 * - Token rotation prevents refresh token reuse
 * - Old tokens are properly invalidated
 * - Session continuity maintained through rotation
 */
export async function test_api_guest_token_refresh_rotation_security(
  connection: api.IConnection,
) {
  // Step 1: Create guest session to obtain initial token pair
  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        session_metadata: {
          ip_address: "192.168.1.100",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Store the initial refresh token for later reuse attempt
  const initialRefreshToken: string = initialGuest.token.refresh;
  const initialAccessToken: string = initialGuest.token.access;

  // Step 2: Perform first token refresh using initial refresh token
  const firstRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(firstRefresh);

  // Step 3: Verify new access token and new refresh token received
  TestValidator.predicate(
    "new access token should be different from initial access token",
    firstRefresh.token.access !== initialAccessToken,
  );

  TestValidator.predicate(
    "new refresh token should be different from initial refresh token",
    firstRefresh.token.refresh !== initialRefreshToken,
  );

  // Verify the guest ID remains the same (same session)
  TestValidator.equals(
    "guest session ID should remain consistent",
    firstRefresh.id,
    initialGuest.id,
  );

  // Step 4: Attempt to use old refresh token again (should fail)
  await TestValidator.error(
    "old refresh token should be rejected after rotation",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );

  // Step 5: Use new refresh token successfully
  const secondRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: firstRefresh.token.refresh,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(secondRefresh);

  // Verify second refresh also rotates tokens
  TestValidator.predicate(
    "second refresh should also rotate access token",
    secondRefresh.token.access !== firstRefresh.token.access,
  );

  TestValidator.predicate(
    "second refresh should also rotate refresh token",
    secondRefresh.token.refresh !== firstRefresh.token.refresh,
  );

  // Verify session continuity maintained
  TestValidator.equals(
    "guest session ID should remain consistent across all refreshes",
    secondRefresh.id,
    initialGuest.id,
  );
}
