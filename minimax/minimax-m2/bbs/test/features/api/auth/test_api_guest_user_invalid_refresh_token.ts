import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

/**
 * Test token refresh with invalid or expired refresh token.
 *
 * This test validates that the system properly rejects invalid refresh tokens
 * and prevents unauthorized session extension. Ensures appropriate error
 * handling for tampered, expired, or non-existent refresh tokens.
 *
 * The test follows these steps:
 *
 * 1. Create a valid guest user to obtain proper authentication tokens
 * 2. Test refreshing with tampered/modified refresh token
 * 3. Test refreshing with expired-looking refresh token format
 * 4. Test refreshing with completely invalid token format
 * 5. Validate proper error responses for each invalid scenario
 */
export async function test_api_guest_user_invalid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid guest user to get proper tokens for baseline
  const guestUser = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: "Test Guest User",
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
  });
  typia.assert(guestUser);

  // Step 2: Test with tampered refresh token
  const tamperedToken = guestUser.token.refresh.slice(0, -5) + "XXXXX";
  const tamperedConn: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${tamperedToken}` },
  };

  await TestValidator.error(
    "should reject tampered refresh token",
    async () => {
      await api.functional.auth.guestUser.refresh.refreshToken(tamperedConn);
    },
  );

  // Step 3: Test with completely invalid token format
  const invalidToken = "invalid-refresh-token-format";
  const invalidConn: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${invalidToken}` },
  };

  await TestValidator.error(
    "should reject invalid refresh token format",
    async () => {
      await api.functional.auth.guestUser.refresh.refreshToken(invalidConn);
    },
  );

  // Step 4: Test with random string that doesn't look like a token
  const randomString = RandomGenerator.alphabets(50);
  const randomConn: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${randomString}` },
  };

  await TestValidator.error(
    "should reject random string as refresh token",
    async () => {
      await api.functional.auth.guestUser.refresh.refreshToken(randomConn);
    },
  );

  // Step 5: Test with empty token
  const emptyConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer " },
  };

  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.guestUser.refresh.refreshToken(emptyConn);
  });

  // Step 6: Test with JWT token that has valid format but refers to non-existent user
  const fakeJwtPayload = btoa(
    JSON.stringify({
      userId: "non-existent-user-12345",
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeJwtPayload}.fake-signature`;
  const fakeConn: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${fakeToken}` },
  };

  await TestValidator.error(
    "should reject JWT token with non-existent user reference",
    async () => {
      await api.functional.auth.guestUser.refresh.refreshToken(fakeConn);
    },
  );

  // Step 7: Test with token missing required Bearer prefix
  const noBearerConn: api.IConnection = {
    ...connection,
    headers: { Authorization: guestUser.token.refresh },
  };

  await TestValidator.error(
    "should reject token without Bearer prefix",
    async () => {
      await api.functional.auth.guestUser.refresh.refreshToken(noBearerConn);
    },
  );
}
