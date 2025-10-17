import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection when the refresh token has expired.
 *
 * This test validates that the token refresh endpoint properly enforces refresh
 * token expiration policies. The workflow creates a member account to obtain
 * initial tokens, then attempts to refresh using an expired or invalid refresh
 * token to verify the system correctly rejects such requests and requires full
 * re-authentication.
 *
 * Steps:
 *
 * 1. Create a new member account and obtain initial authentication tokens
 * 2. Validate the authentication response structure
 * 3. Attempt to refresh using an invalid/expired refresh token
 * 4. Verify that the refresh request is properly rejected with an error
 */
export async function test_api_member_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial tokens
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  // Step 2: Validate the authentication response structure
  typia.assert(authorizedMember);

  // Step 3 & 4: Attempt to refresh using an invalid/expired refresh token
  // We simulate an expired token by using a clearly invalid token string
  // In a real production scenario, the refresh token would naturally expire after 7 days
  const expiredRefreshToken =
    "expired_invalid_refresh_token_" + RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
}
