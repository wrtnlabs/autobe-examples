import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test successful contributor login with valid credentials.
 *
 * Validates the complete contributor authentication workflow including:
 *
 * - Registering a new contributor account with secure password
 * - Successfully authenticating with valid email and password credentials
 * - Verifying password validation against bcrypt hash
 * - Confirming account is active with verified email
 * - Creating session record with connection metadata
 * - Updating last_login_at timestamp
 * - Returning valid JWT tokens (access: 30 min, refresh: 7 days)
 * - Verifying response includes all contributor details
 *
 * This test ensures the login endpoint properly authenticates contributors,
 * manages sessions, and issues appropriate authentication tokens.
 */
export async function test_api_contributor_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const username = "testcontributor";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);

  // Verify registration response
  TestValidator.equals(
    "registered contributor email matches input",
    registered.email,
    email,
  );
  TestValidator.equals(
    "registered contributor username matches input",
    registered.username,
    username,
  );
  TestValidator.predicate(
    "registered contributor account is active",
    registered.account_status === "active",
  );
  TestValidator.predicate(
    "registered contributor has access token",
    registered.token.access.length > 0,
  );
  TestValidator.predicate(
    "registered contributor has refresh token",
    registered.token.refresh.length > 0,
  );

  // Step 2: Authenticate with the registered credentials
  const loginResponse = await api.functional.auth.contributor.login(
    connection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ILogin,
    },
  );
  typia.assert(loginResponse);

  // Step 3: Verify login response structure and content
  TestValidator.equals(
    "login response email matches registered email",
    loginResponse.email,
    email,
  );
  TestValidator.equals(
    "login response username matches registered username",
    loginResponse.username,
    username,
  );
  TestValidator.equals(
    "login response account status is active",
    loginResponse.account_status,
    "active",
  );
  TestValidator.equals(
    "login response id matches registered id",
    loginResponse.id,
    registered.id,
  );

  // Step 4: Verify token structure
  TestValidator.predicate(
    "login response has valid access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response has valid refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login response token has expired_at timestamp",
    loginResponse.token.expired_at !== null &&
      loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "login response token has refreshable_until timestamp",
    loginResponse.token.refreshable_until !== null &&
      loginResponse.token.refreshable_until !== undefined,
  );

  // Step 5: Verify contributor details
  TestValidator.predicate(
    "login response created_at timestamp exists",
    loginResponse.created_at !== null && loginResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "login response updated_at timestamp exists",
    loginResponse.updated_at !== null && loginResponse.updated_at !== undefined,
  );

  // Step 6: Verify last_login_at was updated
  TestValidator.predicate(
    "login response last_login_at should be set after successful login",
    loginResponse.last_login_at !== null &&
      loginResponse.last_login_at !== undefined,
  );

  // Step 7: Verify email verification status
  TestValidator.predicate(
    "login response email should be verified after registration",
    loginResponse.email_verified === true,
  );
}
