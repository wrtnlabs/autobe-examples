import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user registration flow.
 *
 * This test validates the complete user registration process where a new user
 * creates an account with valid credentials and session context. The test
 * verifies:
 *
 * 1. User account creation with email and password
 * 2. Email stored in lowercase for case-insensitive matching
 * 3. Session creation with client context (IP, user agent, URLs)
 * 4. JWT token generation (access and refresh tokens)
 * 5. Account active status and proper timestamp initialization
 * 6. Token expiration times are properly configured
 *
 * The workflow follows:
 *
 * - Generate valid registration credentials with email and password
 * - Provide required session context (href and referrer URLs)
 * - Call the registration endpoint
 * - Validate user information and token structure
 * - Verify business logic (account active, token expiry ordering)
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // At least 8 characters

  // Step 2: Generate session context
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const user_agent = RandomGenerator.paragraph({ sentences: 1 });

  // Step 3: Call the registration endpoint
  const registrationBody = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
    ip: ip,
    user_agent: user_agent,
  } satisfies ITodoListUser.ICreate;

  const response: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });

  // Step 4: Validate complete response structure and types
  typia.assert(response);

  // Step 5: Validate email is stored in lowercase
  TestValidator.equals(
    "email is stored in lowercase",
    response.email,
    email.toLowerCase(),
  );

  // Step 6: Validate account is active
  TestValidator.equals(
    "account is active (deleted_at is null)",
    response.deleted_at,
    null,
  );

  // Step 7: Validate tokens are present and properly generated
  TestValidator.predicate(
    "access token is provided",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    response.token.refresh.length > 0,
  );

  // Step 8: Validate token expiration ordering
  const accessTokenExpiry = new Date(response.token.expired_at);
  const refreshTokenExpiry = new Date(response.token.refreshable_until);

  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshTokenExpiry > accessTokenExpiry,
  );

  // Step 9: Validate tokens have future expiration
  const now = new Date();
  TestValidator.predicate(
    "access token will not expire immediately",
    accessTokenExpiry > now,
  );
  TestValidator.predicate(
    "refresh token will not expire immediately",
    refreshTokenExpiry > now,
  );
}
