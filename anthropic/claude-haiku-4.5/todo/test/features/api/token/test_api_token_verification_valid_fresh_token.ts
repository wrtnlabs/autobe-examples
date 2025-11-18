import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token verification for a newly issued valid token.
 *
 * This test validates the complete token verification workflow by:
 *
 * 1. Registering a new user via the join endpoint to obtain a fresh access token
 * 2. Using the obtained access token to call the verify-token endpoint
 * 3. Validating that the verification response confirms the token is valid
 * 4. Ensuring all token metadata fields are correctly populated and consistent
 *
 * The test verifies:
 *
 * - Is_valid: true (token passes all validation checks)
 * - User_id: matches the newly registered user
 * - Token_jti: unique JWT ID is properly extracted
 * - Issued_at and expires_at: valid ISO 8601 timestamps with proper ordering
 * - Remaining_lifetime_seconds: positive value indicating token not expired
 * - Is_revoked: false (freshly issued token is not revoked)
 * - User_account_active: true (user account is active)
 * - Failure_reason: null (no validation failures)
 */
export async function test_api_token_verification_valid_fresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user and obtain fresh access token
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Verify the fresh access token using the verify-token endpoint
  const tokenVerification: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connection,
    );
  typia.assert(tokenVerification);

  // Step 3: Validate token verification response indicates valid token
  TestValidator.predicate(
    "token should be valid",
    tokenVerification.is_valid === true,
  );

  // Step 4: Verify user_id matches the registered user
  TestValidator.equals(
    "user_id should match registered user",
    tokenVerification.user_id,
    registeredUser.id,
  );

  // Step 5: Verify token_jti is a non-empty string (JWT ID exists)
  TestValidator.predicate(
    "token_jti should be a non-empty string",
    typeof tokenVerification.token_jti === "string" &&
      tokenVerification.token_jti.length > 0,
  );

  // Step 6: Verify issued_at is a valid ISO 8601 datetime
  TestValidator.predicate(
    "issued_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(tokenVerification.issued_at),
  );

  // Step 7: Verify expires_at is a valid ISO 8601 datetime
  TestValidator.predicate(
    "expires_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(tokenVerification.expires_at),
  );

  // Step 8: Verify expires_at is after issued_at (token has validity period)
  TestValidator.predicate(
    "expires_at should be after issued_at",
    new Date(tokenVerification.expires_at) >
      new Date(tokenVerification.issued_at),
  );

  // Step 9: Verify remaining_lifetime_seconds is positive (token not expired)
  TestValidator.predicate(
    "remaining_lifetime_seconds should be positive",
    tokenVerification.remaining_lifetime_seconds > 0,
  );

  // Step 10: Verify is_revoked is false (freshly issued token is not revoked)
  TestValidator.predicate(
    "is_revoked should be false for fresh token",
    tokenVerification.is_revoked === false,
  );

  // Step 11: Verify user_account_active is true (account is active)
  TestValidator.predicate(
    "user_account_active should be true",
    tokenVerification.user_account_active === true,
  );

  // Step 12: Verify failure_reason is null (no validation failures)
  TestValidator.predicate(
    "failure_reason should be null for valid token",
    tokenVerification.failure_reason === null,
  );
}
