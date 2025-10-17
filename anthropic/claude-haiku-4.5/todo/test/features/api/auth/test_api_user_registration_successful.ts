import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

export async function test_api_user_registration_successful(
  connection: api.IConnection,
) {
  /**
   * Generate valid registration credentials meeting security requirements:
   *
   * - Email: Valid RFC 5321 format
   * - Password: 8+ characters with uppercase, lowercase, digit, and special
   *   character
   */
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = "Test" + RandomGenerator.alphaNumeric(4) + "!@#";

  /**
   * Step 1: Register new user with valid credentials This should create account
   * with status='inactive', email_verified=false
   */
  const authResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: registrationEmail,
        password: registrationPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });

  // Complete response validation - typia.assert ensures all types are correct
  typia.assert(authResponse);

  /**
   * Step 2: Validate user ID exists and is a valid UUID typia.assert already
   * validated format, so just check it's present
   */
  TestValidator.predicate(
    "user ID should be present and non-empty",
    authResponse.id.length > 0,
  );

  /** Step 3: Validate authorization token structure exists */
  TestValidator.predicate(
    "token object should exist",
    authResponse.token !== null && authResponse.token !== undefined,
  );

  const token: IAuthorizationToken = authResponse.token;
  typia.assert(token);

  /**
   * Step 4: Validate access token exists and is non-empty Format validation
   * already done by typia.assert
   */
  TestValidator.predicate(
    "access token should be non-empty string",
    token.access.length > 0,
  );

  /** Step 5: Validate refresh token exists and is non-empty */
  TestValidator.predicate(
    "refresh token should be non-empty string",
    token.refresh.length > 0,
  );

  /** Step 6: Ensure access and refresh tokens are different */
  TestValidator.notEquals(
    "access token and refresh token should be different",
    token.access,
    token.refresh,
  );

  /**
   * Step 7: Validate token expiration timestamps are properly formatted
   * typia.assert already validated date-time format
   */
  TestValidator.predicate(
    "access token expiration should be set",
    token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration should be set",
    token.refreshable_until.length > 0,
  );

  /** Step 8: Validate refresh token exists in response and is accessible */
  TestValidator.predicate(
    "refresh token should be provided in response",
    authResponse.refreshToken !== undefined &&
      authResponse.refreshToken !== null &&
      authResponse.refreshToken.length > 0,
  );

  /** Step 9: Validate token type is Bearer when present */
  if (authResponse.tokenType !== undefined) {
    TestValidator.equals(
      "token type should be Bearer",
      authResponse.tokenType,
      "Bearer",
    );
  }

  /** Step 10: Validate expiration time metadata when present */
  if (authResponse.expiresIn !== undefined) {
    TestValidator.predicate(
      "expiration time should be positive integer",
      authResponse.expiresIn > 0,
    );
  }

  /**
   * Step 11: Verify connection headers were updated with authorization token
   * The SDK automatically sets Authorization header with access token after
   * join
   */
  TestValidator.equals(
    "Authorization header should be set with access token",
    connection.headers?.Authorization,
    token.access,
  );

  /**
   * Step 12: Validate successful registration response structure Confirms all
   * required fields are present for a valid authorized user
   */
  TestValidator.predicate(
    "registration response should contain complete authorization data",
    authResponse.id.length > 0 &&
      token.access.length > 0 &&
      token.refresh.length > 0,
  );
}
