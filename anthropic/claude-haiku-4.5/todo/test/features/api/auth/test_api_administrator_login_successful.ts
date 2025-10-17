import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorLoginRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorLoginRequest";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test successful administrator login workflow.
 *
 * This test validates the complete authentication flow for administrator login,
 * from account creation through successful token issuance.
 *
 * Workflow:
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Attempt login with the created credentials
 * 3. Validate successful authentication response structure
 * 4. Verify JWT token contains required claims
 * 5. Confirm token expiration is set correctly (900 seconds / 15 minutes)
 * 6. Validate administrator authorization object completeness
 */
export async function test_api_administrator_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Create new administrator account through registration endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  // Generate secure password meeting all requirements: >=8 chars, uppercase, lowercase, digit, special char
  const adminPassword = "TestPass123!";

  const registrationRequest = {
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IAdministratorRegistrationRequest;

  const registeredAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: registrationRequest,
    });
  typia.assert(registeredAdmin);

  TestValidator.predicate(
    "registered administrator has valid ID",
    registeredAdmin.id !== null &&
      registeredAdmin.id !== undefined &&
      registeredAdmin.id.length > 0,
  );

  TestValidator.equals(
    "registered administrator email matches input",
    registeredAdmin.email,
    adminEmail,
  );

  // Step 2: Create new connection without authorization header for fresh login
  const freshConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Submit login credentials to authenticate
  const loginRequest = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IAdministratorLoginRequest;

  const loginResponse: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(freshConnection, {
      body: loginRequest,
    });
  typia.assert(loginResponse);

  // Step 4: Validate successful authentication response structure
  TestValidator.equals(
    "login response includes correct administrator ID",
    loginResponse.id,
    registeredAdmin.id,
  );

  TestValidator.equals(
    "login response includes correct email",
    loginResponse.email,
    adminEmail,
  );

  TestValidator.equals(
    "token type is Bearer",
    loginResponse.token_type,
    "Bearer",
  );

  TestValidator.predicate(
    "admin_level is valid (1-5)",
    loginResponse.admin_level >= 1 && loginResponse.admin_level <= 5,
  );

  TestValidator.predicate(
    "expires_in is 900 seconds",
    loginResponse.expires_in === 900,
  );

  // Step 5: Validate JWT token structure
  TestValidator.predicate(
    "access token exists and is non-empty",
    loginResponse.token.access !== null &&
      loginResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists and is non-empty",
    loginResponse.token.refresh !== null &&
      loginResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at timestamp is valid ISO format",
    typeof loginResponse.token.expired_at === "string" &&
      loginResponse.token.expired_at.length > 0 &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        loginResponse.token.expired_at,
      ),
  );

  TestValidator.predicate(
    "refreshable_until timestamp is valid ISO format",
    typeof loginResponse.token.refreshable_until === "string" &&
      loginResponse.token.refreshable_until.length > 0 &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        loginResponse.token.refreshable_until,
      ),
  );

  // Step 6: Verify authorization header was set in connection
  TestValidator.predicate(
    "authorization header is set after login",
    freshConnection.headers !== undefined &&
      freshConnection.headers["Authorization"] === loginResponse.token.access,
  );

  // Step 7: Validate complete administrator authorization object
  typia.assert<ITodoAppAdministrator.IAuthorized>(loginResponse);

  TestValidator.predicate(
    "administrator authorization response is complete",
    loginResponse.id &&
      loginResponse.email &&
      loginResponse.admin_level &&
      loginResponse.token &&
      loginResponse.token_type === "Bearer" &&
      loginResponse.expires_in === 900,
  );
}
