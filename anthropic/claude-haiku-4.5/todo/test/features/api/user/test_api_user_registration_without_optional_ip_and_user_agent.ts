import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration without optional IP and user agent fields.
 *
 * This test validates that a user can successfully register for an account
 * without explicitly providing the optional IP address and user agent fields.
 * The system should extract these values from the request headers
 * automatically:
 *
 * - IP address extracted from the connection headers or request context
 * - User agent extracted from the HTTP headers
 *
 * The test confirms that:
 *
 * 1. User registration succeeds with only mandatory fields (email, password, href,
 *    referrer)
 * 2. A valid user account is created with proper ID and timestamps
 * 3. JWT tokens (access and refresh) are generated for immediate authenticated
 *    access
 * 4. The session is created with server-extracted IP and user agent values
 * 5. All response data conforms to the expected schema with proper types
 *
 * This scenario is important for server-side rendering contexts where the
 * client cannot directly determine the IP address and may not have complete
 * user agent information available.
 */
export async function test_api_user_registration_without_optional_ip_and_user_agent(
  connection: api.IConnection,
) {
  // Generate test data with mandatory fields only (no ip or user_agent)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // Minimum 8 characters for security
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Perform user registration without providing optional ip and user_agent fields
  const registrationResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      // Note: ip and user_agent are intentionally omitted to test server extraction
    } satisfies ITodoListUser.ICreate,
  });

  // Validate the complete response structure using typia assertion
  // This ensures ALL type validations including UUID format, ISO 8601 timestamps, etc.
  typia.assert(registrationResponse);

  // Verify the user account was created successfully
  TestValidator.equals(
    "registered email should match input email",
    registrationResponse.email,
    email,
  );

  TestValidator.predicate(
    "user account should not be deleted",
    registrationResponse.deleted_at === null,
  );

  TestValidator.predicate(
    "user last_login_at should be null for new registration",
    registrationResponse.last_login_at === null,
  );

  // Verify JWT tokens were generated
  TestValidator.predicate(
    "access token should be present and non-empty",
    registrationResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present and non-empty",
    registrationResponse.token.refresh.length > 0,
  );

  // Verify token expiration times are valid
  const accessTokenExpiry = new Date(registrationResponse.token.expired_at);
  const refreshTokenExpiry = new Date(
    registrationResponse.token.refreshable_until,
  );
  const now = new Date();

  TestValidator.predicate(
    "access token expiration should be in the future",
    accessTokenExpiry > now,
  );

  TestValidator.predicate(
    "refresh token expiration should be after access token expiration",
    refreshTokenExpiry >= accessTokenExpiry,
  );

  // Verify the authorization header was automatically set with the access token
  TestValidator.predicate(
    "connection should have Authorization header set with access token",
    connection.headers?.Authorization === registrationResponse.token.access,
  );
}
