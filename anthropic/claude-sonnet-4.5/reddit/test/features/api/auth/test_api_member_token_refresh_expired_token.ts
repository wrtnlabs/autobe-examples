import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test token refresh failure with expired refresh token.
 *
 * This test validates the token refresh mechanism when attempting to use an
 * expired refresh token that has passed its 30-day validity period. The system
 * should reject the refresh request and require full re-authentication.
 *
 * Test workflow:
 *
 * 1. Create a new member account to obtain valid authentication tokens
 * 2. Simulate an expired refresh token scenario by using invalid tokens
 * 3. Attempt to refresh using the invalid/expired token
 * 4. Validate that the refresh request is rejected with an authentication error
 * 5. Confirm that valid refresh tokens still work correctly
 * 6. Verify that member information is properly returned on successful refresh
 */
export async function test_api_member_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish initial session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  // Generate password meeting complexity requirements: min 8 chars with uppercase, lowercase, number, special char
  const memberPassword = "Pass123!" + RandomGenerator.alphaNumeric(4);
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const createdMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Simulate expired refresh token scenario
  // Note: Since we cannot actually wait 30 days or manipulate server time in this test,
  // we use malformed/invalid tokens to simulate the behavior of expired tokens.
  // Both expired and invalid tokens should be rejected by the system with authentication errors.
  const expiredRefreshToken = "expired_" + createdMember.token.refresh;

  // Step 3: Attempt to refresh using the expired/invalid token
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );

  // Additional test: Verify that using a completely random invalid token also fails
  const randomInvalidToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.error(
    "refresh with random invalid token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: randomInvalidToken,
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );

  // Step 4: Validate that the original valid refresh token still works (not expired yet)
  const refreshedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: createdMember.token.refresh,
      } satisfies IRedditLikeMember.IRefresh,
    });
  typia.assert(refreshedMember);

  // Step 5: Verify that refresh with valid token returns correct member information
  TestValidator.equals(
    "refreshed member ID should match original",
    refreshedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "refreshed member username should match original",
    refreshedMember.username,
    createdMember.username,
  );
  TestValidator.equals(
    "refreshed member email should match original",
    refreshedMember.email,
    createdMember.email,
  );
}
