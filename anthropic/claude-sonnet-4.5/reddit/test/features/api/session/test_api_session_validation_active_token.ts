import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Validates JWT access token for an active, non-expired session.
 *
 * This test verifies that a freshly issued access token is properly validated
 * by the session validation endpoint. It creates a new member account to obtain
 * valid authentication tokens, then immediately validates the access token to
 * confirm the session is active and returns correct user information.
 *
 * Test workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Extract the access token from the registration response
 * 3. Call the session validation endpoint with the access token
 * 4. Verify validation response confirms token is valid
 * 5. Verify session is active and user information matches
 */
export async function test_api_session_validation_active_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to obtain valid access token
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = "SecurePass123!@#";

  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(registeredMember);

  // Step 2: Extract access token from registration response
  const accessToken: string = registeredMember.token.access;

  // Step 3: Validate the access token using session validation endpoint
  const validationResult: IRedditLikeAuthSession.IValidationResult =
    await api.functional.redditLike.auth.session.validate(connection, {
      body: {
        access_token: accessToken,
      } satisfies IRedditLikeAuthSession.IValidate,
    });
  typia.assert(validationResult);

  // Step 4: Verify the token is valid and session is active
  TestValidator.equals("session should be valid", validationResult.valid, true);

  // Step 5: Verify user ID matches the registered member
  const userId = typia.assert(validationResult.user_id!);
  TestValidator.equals(
    "user ID should match registered member",
    userId,
    registeredMember.id,
  );

  // Step 6: Verify username matches the registered member
  const username = typia.assert(validationResult.username!);
  TestValidator.equals(
    "username should match registered member",
    username,
    registeredMember.username,
  );

  // Step 7: Verify role is returned
  const role = typia.assert(validationResult.role!);

  // Step 8: Verify expiration timestamp is present
  const expiresAt = typia.assert(validationResult.expires_at!);
}
