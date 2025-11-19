import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection when member account is suspended.
 *
 * This test validates the security requirement that suspended member accounts
 * cannot refresh their authentication tokens, even when possessing valid
 * refresh tokens that were issued before the account suspension occurred.
 *
 * The test workflow:
 *
 * 1. Create a new member account via registration
 * 2. Obtain initial access and refresh tokens from successful registration
 * 3. Attempt to refresh tokens using the valid refresh token
 * 4. Verify that the refresh operation properly handles account status
 *
 * Since no account suspension API endpoints are available in the provided
 * materials, this test validates the token refresh mechanism itself and ensures
 * the refresh operation completes successfully for active accounts. In a
 * production scenario with suspension APIs available, this would test that
 * suspended accounts receive appropriate error responses during refresh.
 */
export async function test_api_member_token_refresh_for_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and obtain initial tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
    >(),
  );

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    ip: "127.0.0.1",
    href: "https://discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationBody,
  });
  typia.assert(registeredMember);

  // Validate registration response structure
  TestValidator.predicate(
    "registered member has valid ID",
    registeredMember.id.length > 0,
  );
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    memberUsername,
  );
  TestValidator.predicate(
    "initial tokens are present",
    registeredMember.token !== null && registeredMember.token !== undefined,
  );

  // Step 2: Extract the refresh token from registration response
  const initialRefreshToken = registeredMember.token.refresh;

  TestValidator.predicate(
    "refresh token is valid string",
    typeof initialRefreshToken === "string" && initialRefreshToken.length > 0,
  );

  // Step 3: Attempt to refresh the authentication tokens
  // Note: Since no account suspension API is available, this tests the
  // refresh mechanism for an active (non-suspended) account
  const refreshRequestBody = {
    refresh_token: initialRefreshToken,
  } satisfies IDiscussionBoardMember.IRefresh;

  const refreshedMember = await api.functional.auth.member.refresh(connection, {
    body: refreshRequestBody,
  });
  typia.assert(refreshedMember);

  // Step 4: Validate the refresh response
  TestValidator.equals(
    "refreshed member ID matches original",
    refreshedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "refreshed member email matches original",
    refreshedMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "refreshed member username matches original",
    refreshedMember.username,
    registeredMember.username,
  );

  // Validate new token structure
  TestValidator.predicate(
    "new access token is present",
    refreshedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is present",
    refreshedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration timestamp is valid",
    new Date(refreshedMember.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token validity period is valid",
    new Date(refreshedMember.token.refreshable_until).getTime() > Date.now(),
  );

  // Validate account status flags
  TestValidator.equals(
    "account is not suspended",
    refreshedMember.is_suspended,
    false,
  );
  TestValidator.predicate(
    "account has expected verification status",
    typeof refreshedMember.email_verified === "boolean",
  );
}
