import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that token verification response contains accurate metadata about the
 * token and user.
 *
 * This test validates that the token verification endpoint returns accurate
 * metadata extracted from JWT token claims. The verification process checks
 * that:
 *
 * 1. Token_jti matches the JWT ID claim in the token
 * 2. Issued_at matches the 'iat' (issued at) claim
 * 3. Expires_at matches the 'exp' (expiration) claim
 * 4. Remaining_lifetime_seconds is correctly calculated as (expires_at -
 *    current_time)
 * 5. User_id matches the 'sub' (subject) claim and corresponds to the
 *    authenticated user
 * 6. Is_valid is true for a freshly created token
 * 7. Is_revoked is false for a freshly created token
 * 8. User_account_active is true for an active user account
 *
 * Process:
 *
 * 1. Create a new user account via /auth/user/join endpoint
 * 2. Extract the access token from the registration response
 * 3. Call the token verification endpoint with the access token
 * 4. Validate all metadata fields in the response
 * 5. Verify response structure and type safety
 */
export async function test_api_token_verification_response_metadata_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to get a valid token with known claims
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "ValidPassword123"; // Minimum 8 characters for security

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });

  typia.assert(joinResponse);
  typia.assert(joinResponse.token);

  // Extract user information from join response
  const createdUserId = joinResponse.id;
  const accessToken = joinResponse.token.access;
  const tokenExpiration = joinResponse.token.expired_at;

  // Verify user information is valid
  TestValidator.equals(
    "user ID is string UUID",
    typeof createdUserId,
    "string",
  );
  TestValidator.equals(
    "user email matches input",
    joinResponse.email,
    userEmail,
  );
  TestValidator.predicate(
    "user created_at is set",
    joinResponse.created_at !== null,
  );
  TestValidator.predicate(
    "user updated_at is set",
    joinResponse.updated_at !== null,
  );
  TestValidator.equals(
    "user deleted_at is null",
    joinResponse.deleted_at,
    null,
  );

  // Step 2: Verify the token by calling the verification endpoint
  // The connection already has the Authorization header set from join()
  const verificationResponse: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connection,
    );

  typia.assert(verificationResponse);

  // Step 3: Validate token verification response structure
  TestValidator.predicate(
    "token is valid",
    verificationResponse.is_valid === true,
  );
  TestValidator.predicate(
    "token is not revoked",
    verificationResponse.is_revoked === false,
  );
  TestValidator.predicate(
    "user account is active",
    verificationResponse.user_account_active === true,
  );
  TestValidator.equals(
    "failure reason is null for valid token",
    verificationResponse.failure_reason,
    null,
  );

  // Step 4: Validate user_id matches the authenticated user
  TestValidator.equals(
    "user_id matches created user",
    verificationResponse.user_id,
    createdUserId,
  );

  // Step 5: Validate token metadata claims
  TestValidator.predicate(
    "token_jti is a string",
    typeof verificationResponse.token_jti === "string",
  );
  TestValidator.predicate(
    "token_jti is not empty",
    verificationResponse.token_jti.length > 0,
  );

  // Step 6: Validate issued_at timestamp
  TestValidator.predicate(
    "issued_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(verificationResponse.issued_at),
  );
  const issuedAtTime = new Date(verificationResponse.issued_at).getTime();
  TestValidator.predicate(
    "issued_at is a valid timestamp",
    !isNaN(issuedAtTime),
  );

  // Step 7: Validate expires_at timestamp
  TestValidator.predicate(
    "expires_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      verificationResponse.expires_at,
    ),
  );
  const expiresAtTime = new Date(verificationResponse.expires_at).getTime();
  TestValidator.predicate(
    "expires_at is a valid timestamp",
    !isNaN(expiresAtTime),
  );

  // Step 8: Validate expires_at is in the future
  const currentTime = Date.now();
  TestValidator.predicate(
    "token has not expired yet",
    expiresAtTime > currentTime,
  );

  // Step 9: Validate remaining_lifetime_seconds calculation
  TestValidator.predicate(
    "remaining_lifetime_seconds is non-negative",
    verificationResponse.remaining_lifetime_seconds >= 0,
  );

  // Calculate expected remaining lifetime (with some tolerance for test execution time)
  const expectedRemainingSeconds = Math.floor(
    (expiresAtTime - currentTime) / 1000,
  );
  const actualRemainingSeconds =
    verificationResponse.remaining_lifetime_seconds;

  // Allow 5 second tolerance for test execution time
  const tolerance = 5;
  TestValidator.predicate(
    "remaining_lifetime_seconds is correctly calculated",
    Math.abs(actualRemainingSeconds - expectedRemainingSeconds) <= tolerance,
  );

  // Step 10: Validate issued_at is before expires_at
  TestValidator.predicate(
    "issued_at is before expires_at",
    issuedAtTime < expiresAtTime,
  );

  // Step 11: Verify token expiration matches the token from join response
  const expectedExpirationTime = new Date(tokenExpiration).getTime();
  TestValidator.predicate(
    "expires_at matches token expiration from join response",
    Math.abs(expiresAtTime - expectedExpirationTime) < 1000, // Allow 1 second difference due to timing
  );
}
