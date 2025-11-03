import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test successful admin authentication workflow with valid credentials.
 *
 * This test validates the complete admin login lifecycle:
 *
 * 1. Register a new admin account with known credentials
 * 2. Authenticate with valid email and password
 * 3. Verify JWT token generation with admin role claims
 * 4. Confirm token structure and expiration times
 * 5. Validate that authenticated requests can be made with the token
 *
 * The test ensures admin role permissions are properly assigned and the admin
 * can perform administrative operations after successful login.
 */
export async function test_api_admin_login_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Register admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const registered: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(registered);

  TestValidator.equals(
    "registered admin email should match input",
    registered.email,
    adminEmail,
  );
  TestValidator.equals(
    "registered admin status should be active",
    registered.status,
    "active",
  );

  // Step 2: Create unauthenticated connection for fresh login attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Authenticate with valid credentials
  const loginRequest = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ILogin;

  const authenticated: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(unauthConn, {
      body: loginRequest,
    });
  typia.assert(authenticated);

  // Step 4: Verify admin identity and authorization response
  TestValidator.equals(
    "authenticated admin ID should match registered admin",
    authenticated.id,
    registered.id,
  );
  TestValidator.equals(
    "authenticated admin email should match login email",
    authenticated.email,
    adminEmail,
  );
  TestValidator.equals(
    "authenticated admin status should be active",
    authenticated.status,
    "active",
  );

  // Step 5: Verify token structure and expiration
  typia.assert<IAuthorizationToken>(authenticated.token);
  TestValidator.predicate(
    "access token should be non-empty string",
    authenticated.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    authenticated.token.refresh.length > 0,
  );

  // Verify token expiration times are in proper format
  const expiredAtDate = new Date(authenticated.token.expired_at);
  TestValidator.predicate(
    "access token expiration should be valid date",
    !isNaN(expiredAtDate.getTime()),
  );

  const refreshableUntilDate = new Date(authenticated.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration should be valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  TestValidator.predicate(
    "refresh token should be valid longer than access token",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );

  // Step 6: Verify timestamps on admin object
  const createdAtDate = new Date(authenticated.created_at);
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(createdAtDate.getTime()),
  );

  const updatedAtDate = new Date(authenticated.updated_at);
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(updatedAtDate.getTime()),
  );

  // Step 7: Verify connection headers were updated with auth token
  TestValidator.predicate(
    "connection Authorization header should be set after login",
    (connection.headers?.Authorization as string | undefined)?.startsWith(
      "Bearer ",
    ) === true,
  );
}
