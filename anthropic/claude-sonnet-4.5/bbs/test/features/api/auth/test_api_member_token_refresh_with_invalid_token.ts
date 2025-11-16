import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member token refresh behavior when providing an invalid refresh token.
 *
 * This test validates proper security handling of invalid token formats by
 * attempting to refresh authentication tokens using various forms of invalid
 * refresh tokens. The API should reject all invalid tokens and not issue new
 * authentication credentials.
 *
 * Test Steps:
 *
 * 1. Generate an invalid refresh token (malformed JWT, random string, empty
 *    string)
 * 2. Attempt to call the refresh endpoint with the invalid token
 * 3. Validate that the operation fails with appropriate error response
 * 4. Verify that no tokens are issued for invalid inputs
 *
 * This test is critical for authentication security - it ensures attackers
 * cannot obtain valid tokens by submitting random or malformed refresh tokens.
 */
export async function test_api_member_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Test with a completely random invalid token string
  await TestValidator.error(
    "should reject random invalid refresh token",
    async () => {
      const invalidToken = RandomGenerator.alphaNumeric(32);
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: invalidToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );

  // Test with an empty string token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });

  // Test with a malformed JWT-like token
  await TestValidator.error("should reject malformed JWT token", async () => {
    const malformedJWT = `${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(30)}.${RandomGenerator.alphaNumeric(20)}`;
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: malformedJWT,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });

  // Test with a very long invalid token
  await TestValidator.error(
    "should reject excessively long invalid token",
    async () => {
      const longInvalidToken = RandomGenerator.alphaNumeric(500);
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: longInvalidToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
}
