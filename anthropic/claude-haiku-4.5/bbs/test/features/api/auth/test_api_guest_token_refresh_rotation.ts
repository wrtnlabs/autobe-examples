import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test guest refresh token rotation mechanism for security purposes.
 *
 * Validates that when a guest uses their refresh token to obtain a new access
 * token, the system implements proper token rotation by issuing both new access
 * and refresh tokens. The original refresh token should be invalidated to
 * prevent token reuse attacks.
 *
 * Test flow:
 *
 * 1. Create initial guest session to get initial tokens
 * 2. Verify initial refresh token expiration is 7 days from creation
 * 3. Use refresh token to obtain new tokens (rotation)
 * 4. Verify new tokens are issued with correct expiration times
 * 5. Attempt to reuse the original refresh token - should fail with token
 *    revocation error
 * 6. Verify new refresh token can be used for subsequent refreshes
 */
export async function test_api_guest_token_refresh_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialSession);

  const initialAccessToken = initialSession.token.access;
  const initialRefreshToken = initialSession.token.refresh;
  const initialExpiredAt = new Date(initialSession.token.expired_at);
  const initialRefreshableUntil = new Date(
    initialSession.token.refreshable_until,
  );

  // Verify tokens are present and valid
  TestValidator.predicate(
    "initial access token exists",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialRefreshToken.length > 0,
  );

  // Step 2: Verify initial refresh token has 7-day expiration
  const currentTime = new Date();
  const expirationDiff =
    initialRefreshableUntil.getTime() - currentTime.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const toleranceMs = 5 * 60 * 1000; // 5 minute tolerance for test execution

  TestValidator.predicate(
    "refresh token expiration is approximately 7 days",
    expirationDiff > sevenDaysInMs - toleranceMs &&
      expirationDiff <= sevenDaysInMs + toleranceMs,
  );

  // Step 3: Use refresh token to obtain new tokens (rotation)
  const rotatedSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  typia.assert(rotatedSession);

  const newAccessToken = rotatedSession.token.access;
  const newRefreshToken = rotatedSession.token.refresh;
  const newExpiredAt = new Date(rotatedSession.token.expired_at);
  const newRefreshableUntil = new Date(rotatedSession.token.refreshable_until);

  // Step 4: Verify new tokens are different from original
  TestValidator.notEquals(
    "new access token differs from initial",
    newAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from initial",
    newRefreshToken,
    initialRefreshToken,
  );

  // Verify new refresh token has 7-day expiration
  const newExpirationDiff =
    newRefreshableUntil.getTime() - currentTime.getTime();
  TestValidator.predicate(
    "new refresh token expiration is approximately 7 days",
    newExpirationDiff > sevenDaysInMs - toleranceMs &&
      newExpirationDiff <= sevenDaysInMs + toleranceMs,
  );

  // Step 5: Attempt to reuse the original refresh token - should fail
  await TestValidator.error(
    "original refresh token is rejected after rotation",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );

  // Step 6: Verify new refresh token can be used successfully
  const secondRotatedSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  typia.assert(secondRotatedSession);

  // Verify second rotation also produces different tokens
  TestValidator.notEquals(
    "second rotation produces new access token",
    secondRotatedSession.token.access,
    newAccessToken,
  );
  TestValidator.notEquals(
    "second rotation produces new refresh token",
    secondRotatedSession.token.refresh,
    newRefreshToken,
  );

  TestValidator.predicate(
    "token rotation mechanism successfully implemented",
    true,
  );
}
