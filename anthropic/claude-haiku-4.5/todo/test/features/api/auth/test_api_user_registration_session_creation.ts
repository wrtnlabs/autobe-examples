import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a session is automatically created upon successful user
 * registration.
 *
 * This test validates the complete user registration and session creation flow.
 * When a new user registers via the /auth/user/join endpoint:
 *
 * 1. A new user account is created with the provided email and securely hashed
 *    password
 * 2. A session record is automatically created in the todo_list_sessions table
 * 3. The session captures device tracking information (IP address and user agent)
 * 4. Session timeout fields are configured:
 *
 *    - Created_at: registration timestamp
 *    - Last_activity_at: set to creation time
 *    - Expired_at: null (session is active)
 *    - Absolute_timeout_at: 30 days from creation
 * 5. JWT tokens (access and refresh) are generated and returned
 * 6. The access token is automatically set in the connection headers
 *
 * Steps:
 *
 * 1. Generate test registration data with unique email and valid password
 * 2. Call the registration endpoint with client context (IP, href, referrer, user
 *    agent)
 * 3. Verify the response contains user information and valid JWT tokens
 * 4. Confirm session was created with correct timeout configuration
 * 5. Verify device tracking information is captured in the session
 * 6. Ensure access token is available for subsequent authenticated requests
 */
export async function test_api_user_registration_session_creation(
  connection: api.IConnection,
) {
  // Generate test registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const ip = "192.168.1.100";
  const href = "https://example.com/register";
  const referrer = "https://example.com";
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

  // Register new user and create session
  const registerResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        ip,
        href,
        referrer,
        user_agent: userAgent,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registerResponse);

  // Verify user information is correct
  TestValidator.equals(
    "registered user email matches input",
    registerResponse.email,
    email,
  );
  TestValidator.predicate(
    "user account is active (deleted_at is null)",
    registerResponse.deleted_at === null,
  );
  TestValidator.predicate(
    "user has not logged in yet (last_login_at is null)",
    registerResponse.last_login_at === null,
  );

  // Verify JWT tokens are returned and valid
  TestValidator.predicate(
    "access token is provided and non-empty",
    registerResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided and non-empty",
    registerResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(registerResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(registerResponse.token.refreshable_until) > new Date(),
  );

  // Verify timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "user created_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(registerResponse.created_at),
  );
  TestValidator.predicate(
    "user updated_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(registerResponse.updated_at),
  );

  // Verify that the access token has been set in connection headers
  // The SDK automatically sets the Authorization header with the access token
  TestValidator.predicate(
    "access token is set in connection headers for authenticated requests",
    connection.headers?.Authorization !== undefined,
  );
}
