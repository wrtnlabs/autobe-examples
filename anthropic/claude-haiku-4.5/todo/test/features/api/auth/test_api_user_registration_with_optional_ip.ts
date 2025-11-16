import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user registration with optional IP address parameter.
 *
 * This test validates the complete user registration workflow with optional
 * client IP address tracking. A new user registers by providing email,
 * password, current page URL (href), referrer URL, and an optional client IP
 * address for session tracking and security monitoring purposes.
 *
 * The test verifies:
 *
 * 1. User registration succeeds with all required and optional parameters
 * 2. Response contains valid user data with ID in UUID format
 * 3. JWT tokens (access and refresh) are properly generated
 * 4. Token expiration times are set correctly and in the future
 * 5. User timestamps (created_at, updated_at) are valid ISO 8601 format
 * 6. Optional deleted_at field is null for newly created accounts
 * 7. Optional last_active_at field is properly initialized
 *
 * This workflow covers:
 *
 * - Email validation (unique, valid format)
 * - Password validation (minimum 8 characters)
 * - Session context capture (href, referrer, optional IP)
 * - JWT token generation with expiration metadata
 * - Complete user account initialization
 */
export async function test_api_user_registration_with_optional_ip(
  connection: api.IConnection,
) {
  // Step 1: Generate test data with valid email, password, URLs, and IP address
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // Minimum 8 characters required
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const clientIp = `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

  // Step 2: Perform user registration with optional IP address
  const registrationData = {
    email,
    password,
    href,
    referrer,
    ip: clientIp,
  } satisfies ITodoAppUser.ICreate;

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the response structure and type safety
  typia.assert(authorizedUser);

  // Step 4: Verify user ID is a valid UUID format
  TestValidator.predicate(
    "user ID is in UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );

  // Step 5: Verify email matches input email
  TestValidator.equals("email matches input", authorizedUser.email, email);

  // Step 6: Verify created_at and updated_at are valid timestamps
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(authorizedUser.created_at)),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(authorizedUser.updated_at)),
  );

  // Step 7: Verify deleted_at is null for new accounts
  TestValidator.equals(
    "deleted_at is null for new account",
    authorizedUser.deleted_at,
    null,
  );

  // Step 8: Verify last_active_at exists and is valid if set
  if (authorizedUser.last_active_at) {
    TestValidator.predicate(
      "last_active_at is valid ISO 8601 timestamp when set",
      () => !isNaN(Date.parse(authorizedUser.last_active_at!)),
    );
  }

  // Step 9: Verify token structure and expiration times
  TestValidator.predicate(
    "access token is non-empty string",
    () =>
      typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    () =>
      typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );

  // Step 10: Verify token expiration times
  const accessTokenExpiry = new Date(authorizedUser.token.expired_at);
  const refreshTokenExpiry = new Date(authorizedUser.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    () => accessTokenExpiry > now,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    () => refreshTokenExpiry > now,
  );

  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    () => refreshTokenExpiry > accessTokenExpiry,
  );

  // Step 11: Verify token expiration timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "expired_at is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(authorizedUser.token.expired_at)),
  );

  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );

  // Step 12: Verify connection header contains the access token for authenticated requests
  TestValidator.predicate(
    "Authorization header is set with access token",
    () => connection.headers?.Authorization === authorizedUser.token.access,
  );
}
