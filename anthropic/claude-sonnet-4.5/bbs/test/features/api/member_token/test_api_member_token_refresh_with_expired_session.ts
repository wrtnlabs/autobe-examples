import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh behavior with invalid refresh token.
 *
 * This test validates that the token refresh mechanism properly rejects invalid
 * or malformed refresh tokens. Since the provided API does not include session
 * termination or expiration endpoints, this test focuses on verifying that the
 * refresh endpoint properly validates the refresh token format and rejects
 * invalid tokens.
 *
 * The test verifies that:
 *
 * 1. Refresh operation fails when provided with an invalid token string
 * 2. Appropriate error is returned for invalid refresh tokens
 *
 * This ensures security by preventing token refresh with manipulated or invalid
 * token values.
 */
export async function test_api_member_token_refresh_with_expired_session(
  connection: api.IConnection,
) {
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "refresh should fail with invalid refresh token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
}
