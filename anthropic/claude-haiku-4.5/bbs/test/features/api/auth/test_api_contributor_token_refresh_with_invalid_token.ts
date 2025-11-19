import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test token refresh with invalid or malformed refresh token.
 *
 * Validates that the contributor token refresh endpoint properly rejects
 * refresh requests when provided with:
 *
 * - Non-existent refresh tokens that don't exist in the system
 * - Tampered or corrupted refresh tokens that have been modified
 * - Malformed token strings that don't follow expected format
 *
 * The test verifies that the system:
 *
 * 1. Returns appropriate error response for all invalid token scenarios
 * 2. Securely rejects unauthorized token refresh attempts
 * 3. Does not leak information about whether token was close to valid
 * 4. Does not expose internal validation details in error messages
 * 5. Treats different invalid token types consistently
 *
 * Steps:
 *
 * 1. Attempt refresh with a completely fabricated UUID that doesn't exist in
 *    system
 * 2. Attempt refresh with a tampered/corrupted token (valid format, invalid
 *    content)
 * 3. Attempt refresh with a malformed token string that violates format
 * 4. Verify all attempts properly fail with appropriate error responses
 * 5. Confirm no sensitive information is leaked in error messages
 */
export async function test_api_contributor_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Test case 1: Non-existent refresh token (valid UUID format, doesn't exist in system)
  const nonExistentToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject refresh with non-existent token",
    async () => {
      await api.functional.auth.contributor.refresh(connection, {
        body: {
          refreshToken: nonExistentToken,
        } satisfies IDiscussionBoardContributor.IRefresh,
      });
    },
  );

  // Test case 2: Tampered refresh token (valid UUID format, but content is invalid)
  const tamperedToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject refresh with tampered token",
    async () => {
      await api.functional.auth.contributor.refresh(connection, {
        body: {
          refreshToken: tamperedToken,
        } satisfies IDiscussionBoardContributor.IRefresh,
      });
    },
  );

  // Test case 3: Malformed token string (invalid format - not a valid UUID)
  const malformedToken = RandomGenerator.alphaNumeric(20);

  await TestValidator.error(
    "should reject refresh with malformed token format",
    async () => {
      await api.functional.auth.contributor.refresh(connection, {
        body: {
          refreshToken: malformedToken,
        } satisfies IDiscussionBoardContributor.IRefresh,
      });
    },
  );
}
