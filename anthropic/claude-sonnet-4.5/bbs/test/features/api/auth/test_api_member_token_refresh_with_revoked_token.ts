import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection with invalid refresh token.
 *
 * This test validates that the token refresh endpoint properly rejects invalid
 * or malformed refresh tokens, ensuring that only valid tokens can be used to
 * obtain new access tokens. The test workflow is:
 *
 * 1. Create a new member account to obtain valid authentication tokens
 * 2. Verify the account creation and token generation succeeded
 * 3. Attempt to refresh using an invalid/malformed refresh token
 * 4. Validate that the system properly rejects the invalid token with an error
 *
 * This ensures that the authentication system maintains security by validating
 * refresh tokens before issuing new access tokens, preventing unauthorized
 * access attempts using invalid or fabricated tokens.
 *
 * Note: This test validates token format validation rather than token
 * revocation, as the available API does not provide logout or password change
 * endpoints that would enable testing of actual token revocation scenarios.
 */
export async function test_api_member_token_refresh_with_revoked_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain valid authentication tokens
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });

  // Step 2: Validate the account creation and token structure
  typia.assert(authorizedMember);
  typia.assert(authorizedMember.token);

  // Step 3: Attempt to refresh using an invalid/malformed token
  // This simulates an attacker trying to use a fabricated or corrupted token
  const invalidToken = "invalid_" + RandomGenerator.alphaNumeric(50);

  // Step 4: Validate that the refresh request fails with invalid token
  await TestValidator.error("refresh should reject invalid token", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: invalidToken,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
}
