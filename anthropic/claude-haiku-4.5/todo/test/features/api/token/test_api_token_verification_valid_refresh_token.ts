import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token verification for a refresh token obtained from user
 * authentication.
 *
 * This test validates that a refresh token can be verified successfully and
 * returns appropriate token metadata including token validity status, user
 * information, and remaining lifetime. The test ensures that refresh tokens
 * with longer expiration windows are properly recognized and validated by the
 * token verification system.
 *
 * The test flow:
 *
 * 1. Register a new user and obtain both access and refresh tokens
 * 2. Call the token verification endpoint with the refresh token
 * 3. Validate that the verification response correctly identifies the token as
 *    valid
 * 4. Verify token metadata (user_id, jti, issued_at, expires_at, remaining
 *    lifetime)
 * 5. Confirm refresh token has longer lifetime than access token
 */
export async function test_api_token_verification_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authentication tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Extract tokens from registration response
  const accessToken = registeredUser.token.access;
  const refreshToken = registeredUser.token.refresh;
  const refreshTokenExpiredAt = registeredUser.token.refreshable_until;
  const accessTokenExpiredAt = registeredUser.token.expired_at;

  // 2. Switch connection to use refresh token for verification
  const refreshTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${refreshToken}`,
    },
  };

  // 3. Call token verification endpoint with refresh token
  const tokenVerification: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      refreshTokenConnection,
    );
  typia.assert(tokenVerification);

  // 4. Validate token verification response
  TestValidator.predicate(
    "refresh token should be valid",
    tokenVerification.is_valid === true,
  );

  TestValidator.equals(
    "verified token user_id matches registered user",
    tokenVerification.user_id,
    registeredUser.id,
  );

  TestValidator.predicate(
    "token should not be revoked",
    tokenVerification.is_revoked === false,
  );

  TestValidator.predicate(
    "user account should be active",
    tokenVerification.user_account_active === true,
  );

  TestValidator.predicate(
    "remaining lifetime should be positive",
    tokenVerification.remaining_lifetime_seconds > 0,
  );

  TestValidator.predicate(
    "failure reason should be null for valid token",
    tokenVerification.failure_reason === null,
  );

  // 5. Validate token expiration metadata
  TestValidator.predicate(
    "issued_at should be valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(tokenVerification.issued_at),
  );

  TestValidator.predicate(
    "expires_at should be valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(tokenVerification.expires_at),
  );

  // 6. Verify refresh token has longer lifetime than access token
  const refreshTokenExpiresDate = new Date(refreshTokenExpiredAt);
  const accessTokenExpiresDate = new Date(accessTokenExpiredAt);
  TestValidator.predicate(
    "refresh token expiration should be later than access token",
    refreshTokenExpiresDate.getTime() > accessTokenExpiresDate.getTime(),
  );

  // 7. Verify remaining lifetime calculation is reasonable
  const expiresAtDate = new Date(tokenVerification.expires_at);
  const nowDate = new Date();
  const expectedRemainingSeconds = Math.floor(
    (expiresAtDate.getTime() - nowDate.getTime()) / 1000,
  );

  TestValidator.predicate(
    "remaining lifetime should be approximately correct",
    Math.abs(
      tokenVerification.remaining_lifetime_seconds - expectedRemainingSeconds,
    ) <= 5, // Allow 5 second margin for execution time
  );

  // 8. Verify token has a valid JWT ID (jti)
  TestValidator.predicate(
    "token_jti should not be empty",
    tokenVerification.token_jti.length > 0,
  );
}
