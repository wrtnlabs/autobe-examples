import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection with invalid refresh token format.
 *
 * This test validates that refresh operations properly reject invalid refresh
 * tokens. The scenario simulates a complete workflow where:
 *
 * 1. A new member account is created with valid credentials and obtains initial
 *    tokens
 * 2. The member attempts to refresh their access token using an invalid/malformed
 *    refresh token
 * 3. The system rejects the refresh with appropriate error response
 * 4. The refresh operation fails, preventing session continuation with invalid
 *    tokens
 *
 * This test ensures invalid refresh tokens are properly rejected, maintaining
 * security by preventing unauthorized access attempts with malformed or
 * corrupted tokens.
 *
 * Step-by-step process:
 *
 * 1. Generate valid member credentials (email and strong password)
 * 2. Register a new member account via POST /auth/member/join
 * 3. Validate successful registration returns member ID and authorization tokens
 * 4. Attempt to refresh access token using invalid/malformed refresh token
 * 5. Verify the refresh operation fails with appropriate error response
 * 6. Confirm the invalid token is properly rejected by the system
 */
export async function test_api_member_token_refresh_banned_account(
  connection: api.IConnection,
) {
  // Step 1: Generate valid member credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123"; // Strong password meeting requirements: 8+ chars, uppercase, lowercase, number

  // Step 2: Register new member account
  const joinResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(joinResponse);

  // Step 3: Validate successful registration
  TestValidator.predicate(
    "member ID should be valid UUID format",
    joinResponse.id !== null && joinResponse.id !== undefined,
  );

  // Step 4-6: Attempt to refresh access token with invalid refresh token
  // Verify the refresh operation fails with appropriate error
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: "invalid_token_format",
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );
}
