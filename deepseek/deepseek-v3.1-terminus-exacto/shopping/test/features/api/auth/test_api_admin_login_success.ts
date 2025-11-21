import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test successful administrator login with valid credentials.
 *
 * This E2E test validates the complete authentication workflow for
 * administrator accounts, including account creation, credential validation,
 * token generation, and profile information retrieval. It ensures that the
 * authentication system properly handles administrator login requests and
 * returns comprehensive authentication context for secure platform access.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminCreateData = {
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "support_admin",
    permissions: JSON.stringify({
      user_management: true,
      content_moderation: true,
      analytics_view: true,
    }),
    status: "active",
  } satisfies IShoppingMallAdministrator.ICreate;

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(createdAdmin);

  // Step 2: Perform login with created credentials
  const loginData = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.shoppingmall.com/login",
    referrer: "https://admin.shoppingmall.com/dashboard",
  } satisfies IShoppingMallAdministrator.ILogin;

  const loginResult = await api.functional.auth.admin.login(connection, {
    body: loginData,
  });
  typia.assert(loginResult);

  // Step 3: Validate authentication response structure
  TestValidator.equals(
    "login response administrator ID should match created account",
    loginResult.administrator.id,
    createdAdmin.administrator.id,
  );

  TestValidator.equals(
    "login response administrator email should match login credentials",
    loginResult.administrator.email,
    adminEmail,
  );

  TestValidator.equals(
    "login response administrator role should match created role",
    loginResult.administrator.role,
    adminCreateData.role,
  );

  // Step 4: Validate token structure and expiration
  TestValidator.predicate(
    "access token should be non-empty string",
    loginResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    loginResult.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration should be future date",
    new Date(loginResult.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration should be future date",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );

  // Step 5: Validate administrator summary information
  TestValidator.equals(
    "administrator name should combine first and last name",
    loginResult.administrator.name,
    `${adminCreateData.first_name} ${adminCreateData.last_name}`,
  );
}
