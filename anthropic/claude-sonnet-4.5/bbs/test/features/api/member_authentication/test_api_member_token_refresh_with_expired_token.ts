import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member token refresh behavior with invalid/expired refresh token.
 *
 * This test validates proper error handling when attempting to refresh tokens
 * with an invalid or expired refresh token. Since the test environment does not
 * provide a mechanism to actually expire tokens or manipulate time, this test
 * validates the system's rejection of invalid refresh tokens as a proxy for
 * testing the token validation and error handling logic.
 *
 * Test Steps:
 *
 * 1. Create a new member account and obtain initial authentication tokens
 * 2. Extract the refresh token from the registration response to verify token
 *    structure
 * 3. Attempt to refresh tokens using an invalid/malformed refresh token
 * 4. Validate that the refresh operation fails with appropriate authentication
 *    error
 * 5. Verify system security by ensuring the invalid token is rejected
 */
export async function test_api_member_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via join endpoint
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberUsername = RandomGenerator.name(2);

  const createData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: createData,
  });
  typia.assert(registeredMember);

  // Step 2: Extract and validate the refresh token structure from registration response
  const initialRefreshToken = registeredMember.token.refresh;
  typia.assert<string>(initialRefreshToken);

  TestValidator.predicate(
    "initial refresh token should be a non-empty string",
    initialRefreshToken.length > 0,
  );

  // Step 3: Attempt to refresh with an invalid/expired token
  // Note: Since we cannot actually expire tokens in the test environment,
  // we use an invalid token string to test the error handling logic
  const invalidTokenData = {
    refresh_token: "invalid_or_expired_refresh_token_string_12345",
  } satisfies IDiscussionBoardMember.IRefresh;

  // Step 4: Validate that using an invalid/expired refresh token fails with error
  await TestValidator.error(
    "refresh with invalid or expired token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: invalidTokenData,
      });
    },
  );

  // Step 5: Verify the valid token structure for completeness
  TestValidator.predicate(
    "registered member should have valid token structure",
    registeredMember.token.access.length > 0 &&
      registeredMember.token.refresh.length > 0,
  );
}
