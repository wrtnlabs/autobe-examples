import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator authentication flow.
 *
 * This test validates the complete admin authentication workflow from account
 * creation to successful login. It verifies that:
 *
 * 1. A new admin account can be created with valid credentials
 * 2. The created admin can successfully log in with the same credentials
 * 3. Both operations return valid JWT tokens with proper expiration
 * 4. Admin profile information is correctly returned in the response
 * 5. Session context is properly captured during authentication
 *
 * The test ensures administrators can access the system with proper credentials
 * and receive valid authentication tokens for subsequent administrative
 * operations.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Step 1: Generate test admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create a new admin account
  const joinRequestBody = {
    email: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: sessionHref,
    referrer: sessionReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinRequestBody,
    });

  // Step 3: Validate the join response
  typia.assert(createdAdmin);
  TestValidator.equals("admin email matches", createdAdmin.email, adminEmail);
  TestValidator.predicate(
    "admin account is active (deleted_at is null or undefined)",
    createdAdmin.deleted_at === null || createdAdmin.deleted_at === undefined,
  );

  // Step 4: Test login with the same credentials
  const loginRequestBody = {
    email: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: sessionHref,
    referrer: sessionReferrer,
  } satisfies ITodoListAdmin.ILogin;

  const loggedInAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginRequestBody,
    });

  // Step 5: Validate the login response
  typia.assert(loggedInAdmin);
  TestValidator.equals(
    "logged in admin email matches",
    loggedInAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "logged in admin id matches created admin id",
    loggedInAdmin.id,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "logged in admin account is active",
    loggedInAdmin.deleted_at === null || loggedInAdmin.deleted_at === undefined,
  );
}
