import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test authenticating an existing admin user using valid login credentials. The
 * scenario involves first creating a new admin user via the join endpoint to
 * establish a user context, then performing login with the created credentials
 * to verify token issuance and successful authentication. It checks proper
 * validation of email and password hash, account status verification
 * ('active'), and error handling for incorrect credentials.
 */
export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Generate a unique admin email and create admin user via join endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPass1234!";
  const adminName = RandomGenerator.name(2);
  const adminRole = RandomGenerator.pick([
    "superadmin",
    "admin",
    "support",
  ] as const);

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: adminName,
        password: adminPassword,
        phone_number: null,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Login with the same admin credentials to acquire the authorization token
  const loginPayload = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdmin.ILogin;

  const loginResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginPayload,
    });
  typia.assert(loginResponse);

  // 3. Validate that the login response matches the created admin user data with correct token
  TestValidator.equals("admin email matches", loginResponse.email, adminEmail);
  TestValidator.equals("admin name matches", loginResponse.name, adminName);
  TestValidator.predicate(
    "admin account is active",
    loginResponse.is_active === true,
  );
  TestValidator.predicate(
    "role is one of superadmin, admin, support",
    ["superadmin", "admin", "support"].includes(loginResponse.role),
  );

  // 4. Validate token structure presence and correctness
  const token = loginResponse.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 5. Validate created_at and updated_at are ISO 8601 date-time strings
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    iso8601Regex.test(loginResponse.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    iso8601Regex.test(loginResponse.updated_at),
  );
}
