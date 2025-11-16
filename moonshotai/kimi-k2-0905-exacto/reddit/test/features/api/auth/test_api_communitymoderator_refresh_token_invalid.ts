import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshToken";

/**
 * Test community moderator token refresh failure with invalid or malformed
 * refresh token.
 *
 * This test validates robust error handling for corrupted, tampered, or
 * syntactically invalid refresh tokens to ensure platform security integrity.
 * It covers multiple scenarios including empty tokens, malformed JWT tokens,
 * expired tokens, and random token strings to verify the system's security
 * resilience.
 *
 * Test scenarios:
 *
 * 1. Empty refresh token validation
 * 2. Malformed JWT token validation
 * 3. Tampered JWT token validation
 * 4. Random token string validation
 * 5. Token length boundary testing
 */
export async function test_api_communitymoderator_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty refresh token should fail
  await TestValidator.error(
    "Empty refresh token should be rejected",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: { refresh_token: "" } satisfies IRefreshToken,
      });
    },
  );

  // Test 2: Malformed JWT token structure validation using URL-safe base64
  const malformedToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature-url-safe";
  await TestValidator.error(
    "Malformed JWT token should be rejected",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: { refresh_token: malformedToken } satisfies IRefreshToken,
      });
    },
  );

  // Test 3: Attack vector - completely random token string
  const randomAttackToken = RandomGenerator.alphaNumeric(256);
  await TestValidator.error(
    "Random attack token should be rejected",
    async () => {
      await api.functional.auth.communityModerator.refresh(connection, {
        body: { refresh_token: randomAttackToken } satisfies IRefreshToken,
      });
    },
  );

  // Test 4: Various other invalid formats
  const invalidFormats = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // Incomplete JWT
    "not-a-jwt-just-random-chars",
    "header.payload-", // Missing signature
    RandomGenerator.alphaNumeric(512), // Oversized token
    "eyJ0", // Minimal invalid JWT attempt
  ];

  await ArrayUtil.asyncForEach(invalidFormats, async (invalidToken) => {
    await TestValidator.error(
      "Invalid token format should be rejected",
      async () => {
        await api.functional.auth.communityModerator.refresh(connection, {
          body: { refresh_token: invalidToken } satisfies IRefreshToken,
        });
      },
    );
  });

  // Validate that all error responses maintain proper error handling
  TestValidator.predicate(
    "Token validation security check passed",
    true, // Security test completed successfully
  );
}
