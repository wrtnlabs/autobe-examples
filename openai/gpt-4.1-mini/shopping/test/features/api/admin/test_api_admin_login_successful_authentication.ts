import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create the admin user account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  // Step 2: Login as the created admin user
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
    ip: null,
  } satisfies IShoppingMallAdmin.ILogin;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Validate returned data
  TestValidator.predicate(
    "Admin login returns active account",
    loggedInAdmin.is_active,
  );
  TestValidator.equals(
    "Logged in email matches created email",
    loggedInAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "Logged in role matches created role",
    loggedInAdmin.role,
    "admin",
  );

  TestValidator.predicate(
    "Authorization token is non-empty access token",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "Authorization token is non-empty refresh token",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Authorization token expired_at is valid ISO date",
    !isNaN(Date.parse(loggedInAdmin.token.expired_at)),
  );
  TestValidator.predicate(
    "Authorization token refreshable_until is valid ISO date",
    !isNaN(Date.parse(loggedInAdmin.token.refreshable_until)),
  );
}
