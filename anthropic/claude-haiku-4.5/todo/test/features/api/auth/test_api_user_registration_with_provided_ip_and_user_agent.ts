import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with explicit IP address and user agent provided in
 * the request.
 *
 * Validates that when a user registers with explicit IP address and user agent
 * values in the request body, the system correctly accepts and stores these
 * values instead of extracting from request headers. This is particularly
 * useful for server-side rendering scenarios where the actual client IP cannot
 * be directly determined.
 *
 * The test performs the following validations:
 *
 * 1. Registers a new user with explicit IP and user agent in the request
 * 2. Verifies the response contains valid user information and authentication
 *    tokens
 * 3. Confirms the returned user has all required fields and valid structure
 * 4. Validates that authentication tokens are properly provided and set
 * 5. Ensures the access token is automatically stored in connection headers for
 *    authenticated requests
 */
export async function test_api_user_registration_with_provided_ip_and_user_agent(
  connection: api.IConnection,
) {
  // Generate test user data with explicit IP and user agent
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Valid password with 8+ characters
  const ip = "192.168.1.100"; // Explicitly provided IP address
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register a new user with provided IP and user agent
  const response: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        ip,
        user_agent: userAgent,
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    });

  // Validate the complete response structure - typia.assert handles all type validation
  typia.assert(response);

  // Verify user information matches registration input
  TestValidator.equals(
    "registered user email should match input email",
    response.email,
    email,
  );

  // Verify user account is active (not soft-deleted)
  TestValidator.equals(
    "new account should be active without deletion",
    response.deleted_at,
    null,
  );

  // Verify authentication tokens are present and valid format
  TestValidator.predicate(
    "access token should be non-empty string",
    response.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    response.token.refresh.length > 0,
  );

  // Verify access token is set in connection headers for authenticated requests
  TestValidator.predicate(
    "connection Authorization header should be set with access token",
    connection.headers?.Authorization === response.token.access,
  );

  // Verify user information is consistent in response
  if (response.user) {
    TestValidator.equals(
      "user id in response should match main user id",
      response.user.id,
      response.id,
    );
    TestValidator.equals(
      "user email in response should match registered email",
      response.user.email,
      email,
    );
  }
}
