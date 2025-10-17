import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test session validation behavior with expired access tokens.
 *
 * This test validates that the session validation endpoint correctly handles
 * token expiration scenarios. Since we cannot wait for actual token expiration
 * in automated tests, this test validates the session endpoint with both valid
 * tokens and simulates expired token scenarios by testing invalid token
 * handling.
 *
 * Steps:
 *
 * 1. Register a new member account to obtain valid authentication tokens
 * 2. Validate the session with a valid token to establish baseline behavior
 * 3. Test the validation endpoint with an invalid/malformed token to simulate
 *    expired or corrupted token scenarios
 * 4. Verify that invalid tokens are properly rejected
 * 5. Confirm the validation result structure for both valid and invalid cases
 */
export async function test_api_session_validation_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to obtain access token
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Validate session with the valid token to establish baseline
  const validToken: string = authorizedMember.token.access;

  const validValidationResult: IRedditLikeAuthSession.IValidationResult =
    await api.functional.redditLike.auth.session.validate(connection, {
      body: {
        access_token: validToken,
      } satisfies IRedditLikeAuthSession.IValidate,
    });
  typia.assert(validValidationResult);

  // Verify valid token produces valid session result
  TestValidator.equals(
    "valid token should return valid session",
    validValidationResult.valid,
    true,
  );

  // Step 3: Test with invalid/corrupted token to simulate expired token scenario
  const invalidToken: string = "invalid.jwt.token.simulation";

  const invalidValidationResult: IRedditLikeAuthSession.IValidationResult =
    await api.functional.redditLike.auth.session.validate(connection, {
      body: {
        access_token: invalidToken,
      } satisfies IRedditLikeAuthSession.IValidate,
    });
  typia.assert(invalidValidationResult);

  // Step 4: Verify that invalid token is properly rejected
  TestValidator.equals(
    "invalid token should return invalid session",
    invalidValidationResult.valid,
    false,
  );

  // Step 5: Verify that no user information is returned for invalid token
  TestValidator.equals(
    "user_id should not be present for invalid token",
    invalidValidationResult.user_id,
    undefined,
  );

  TestValidator.equals(
    "username should not be present for invalid token",
    invalidValidationResult.username,
    undefined,
  );

  TestValidator.equals(
    "role should not be present for invalid token",
    invalidValidationResult.role,
    undefined,
  );

  // Verify valid token includes user information
  if (
    validValidationResult.user_id !== null &&
    validValidationResult.user_id !== undefined
  ) {
    const userId = typia.assert(validValidationResult.user_id!);
    TestValidator.equals(
      "user_id should match for valid token",
      userId,
      authorizedMember.id,
    );
  }

  if (
    validValidationResult.username !== null &&
    validValidationResult.username !== undefined
  ) {
    const username = typia.assert(validValidationResult.username!);
    TestValidator.equals(
      "username should match for valid token",
      username,
      authorizedMember.username,
    );
  }
}
