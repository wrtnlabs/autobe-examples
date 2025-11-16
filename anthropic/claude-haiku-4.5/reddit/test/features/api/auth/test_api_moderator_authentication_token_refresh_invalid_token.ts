import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test token refresh failure with an invalid or malformed refresh token.
 *
 * This test validates that the moderator authentication system properly rejects
 * invalid refresh tokens and prevents unauthorized token generation. The test
 * attempts to refresh using tokens that do not match valid JWT format, are
 * corrupted, or have invalid signatures.
 *
 * This tests token validation security to ensure that:
 *
 * - Invalid tokens are rejected with appropriate authentication errors
 * - No new tokens are issued when the refresh token is invalid
 * - The system maintains security integrity by preventing unauthorized token
 *   generation through invalid token exploitation
 *
 * Test steps:
 *
 * 1. Create malformed refresh token (invalid JWT format)
 * 2. Attempt token refresh with invalid token
 * 3. Verify error is thrown and no new tokens are issued
 * 4. Create corrupted refresh token (tampered payload)
 * 5. Attempt token refresh with corrupted token
 * 6. Verify error is thrown
 * 7. Create token with invalid signature
 * 8. Attempt token refresh with invalid signature
 * 9. Verify error is thrown and system remains secure
 */
export async function test_api_moderator_authentication_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Invalid JWT format token
  // A completely malformed token that doesn't follow JWT structure (header.payload.signature)
  const malformedToken = RandomGenerator.alphaNumeric(50);

  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: malformedToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );

  // Test 2: Corrupted refresh token (modified payload)
  // Create a token-like structure but with tampered content
  const corruptedToken = `${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(30)}.${RandomGenerator.alphaNumeric(20)}`;

  await TestValidator.error(
    "refresh with corrupted token payload should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: corruptedToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );

  // Test 3: Token with invalid signature
  // Create a JWT-like structure with modified signature
  const invalidSignatureToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.${RandomGenerator.alphaNumeric(40)}`;

  await TestValidator.error(
    "refresh with invalid signature should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidSignatureToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );

  // Test 4: Empty or blank refresh token
  const blankToken = "";

  await TestValidator.error(
    "refresh with blank token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: blankToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );

  // Test 5: Random invalid token with special characters
  const randomInvalidToken = `${RandomGenerator.alphaNumeric(15)}!@#$%${RandomGenerator.alphaNumeric(15)}`;

  await TestValidator.error(
    "refresh with special character token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: randomInvalidToken,
        } satisfies ICommunityPlatformModerator.IRefresh,
      });
    },
  );
}
