import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator login workflow with valid credentials.
 *
 * This test validates the complete admin authentication flow by first creating
 * a new admin account and then authenticating with the same credentials. It
 * verifies that the login endpoint returns valid JWT tokens (access and
 * refresh) along with complete admin profile information including ID, email,
 * and timestamps.
 *
 * Test steps:
 *
 * 1. Create a new admin account using join endpoint with random credentials
 * 2. Authenticate using login endpoint with the same email and password
 * 3. Validate response contains admin ID, email, and timestamps
 * 4. Verify JWT token structure with access/refresh tokens and expiration times
 * 5. Confirm that returned admin information matches the created account
 */
export async function test_api_admin_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Generate random admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const currentReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create a new admin account
  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: currentHref,
      referrer: currentReferrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Step 3: Login with the same credentials
  const loggedInAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: currentHref,
      referrer: currentReferrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(loggedInAdmin);

  // Step 4: Validate admin information matches
  TestValidator.equals(
    "logged in admin ID matches created admin ID",
    loggedInAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "logged in admin email matches",
    loggedInAdmin.email,
    adminEmail,
  );

  // Step 5: Verify token structure exists
  TestValidator.predicate(
    "access token is not empty",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid date-time string",
    loggedInAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a valid date-time string",
    loggedInAdmin.token.refreshable_until.length > 0,
  );

  // Step 6: Verify timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    loggedInAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    loggedInAdmin.updated_at.length > 0,
  );
}
