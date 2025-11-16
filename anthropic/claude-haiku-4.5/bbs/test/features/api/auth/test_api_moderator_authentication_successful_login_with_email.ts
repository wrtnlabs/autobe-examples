import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator authentication using email credentials.
 *
 * This test validates the core authentication workflow for moderators. A
 * moderator with an active account logs in by providing their registered email
 * and correct password. The system validates credentials against the stored
 * password hash, verifies the account status is 'active', creates a new session
 * record with security context (IP, referrer, href), and returns JWT access and
 * refresh tokens along with moderator summary information.
 *
 * Test steps:
 *
 * 1. Generate valid email and password credentials for moderator login
 * 2. Create login request with email, password, IP address, href, and referrer
 * 3. Call the moderator login API endpoint
 * 4. Validate the response contains JWT tokens (access and refresh)
 * 5. Verify token expiration timestamps are valid future dates
 * 6. Validate moderator summary information (id, display_name, account_status)
 * 7. Confirm account_status is 'active' for successful login
 */
export async function test_api_moderator_authentication_successful_login_with_email(
  connection: api.IConnection,
) {
  // Step 1: Generate valid moderator login credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Valid password format
  const ipAddress = "192.168.1.100"; // Sample IPv4 address for testing
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 2 & 3: Create login request and call moderator login API
  const loginRequest = {
    email,
    password,
    ip: ipAddress,
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  const response = await api.functional.auth.moderator.login(connection, {
    body: loginRequest,
  });

  // Step 4: Validate response type and presence of JWT tokens
  typia.assert(response);
  typia.assert<IDiscussionBoardModerator.IAuthorized>(response);

  // Verify tokens exist and are non-empty strings
  TestValidator.predicate(
    "access token should be a non-empty string",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    response.token.refresh.length > 0,
  );

  // Step 5: Validate token expiration timestamps
  const accessTokenExpiry = new Date(response.token.expired_at);
  const refreshTokenExpiry = new Date(response.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration should be in the future",
    accessTokenExpiry.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshTokenExpiry.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshTokenExpiry.getTime() >= accessTokenExpiry.getTime(),
  );

  // Step 6: Validate moderator summary information
  const moderator = response.moderator;
  TestValidator.predicate(
    "moderator id should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  TestValidator.predicate(
    "moderator display_name should not be empty",
    moderator.display_name.length > 0,
  );
  TestValidator.predicate(
    "moderator display_name should be within length constraints",
    moderator.display_name.length >= 1 && moderator.display_name.length <= 50,
  );

  // Step 7: Confirm account_status is 'active' for successful login
  TestValidator.equals(
    "moderator account_status should be active",
    moderator.account_status,
    "active",
  );

  // Verify the authenticated moderator id is returned
  TestValidator.predicate(
    "response should contain moderator id",
    response.id === moderator.id,
  );
}
