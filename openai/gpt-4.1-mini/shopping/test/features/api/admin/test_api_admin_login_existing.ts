import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator login operation with existing admin account.
 *
 * This test ensures that an administrator can successfully register (join) and
 * then authenticate (login) with valid credentials. It also validates error
 * scenarios such as login failures due to wrong passwords or non-existent
 * emails.
 *
 * Steps:
 *
 * 1. Register a new admin user with a valid email and password hash.
 * 2. Attempt to login with the exact credentials used for registration.
 * 3. Verify successful login response contains a valid JWT token.
 * 4. Attempt login with incorrect password to assert failure.
 * 5. Attempt login with non-existent email to assert failure.
 */
export async function test_api_admin_login_existing(
  connection: api.IConnection,
) {
  // Generate new admin email and password hash
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // For testing purpose, simulate password_hash as the password string

  // 1. Register a new admin user via join
  const adminCreate = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(joinedAdmin);
  TestValidator.equals(
    "joined admin email",
    joinedAdmin.email,
    adminCreate.email,
  );

  // Prepare login input with correct credentials
  const loginInputCorrect = {
    email: adminEmail,
    password: adminPassword,
    type: "admin",
    remember_me: true,
  } satisfies IShoppingMallAdmin.ILogin;

  // 2. Attempt login with correct credentials
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginInputCorrect,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged in admin email equals created admin email",
    loggedInAdmin.email,
    adminEmail,
  );

  TestValidator.predicate(
    "logged in admin has non-empty access token",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "logged in admin has non-empty refresh token",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );

  // 4. Attempt login with incorrect password
  const loginInputWrongPassword = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16), // wrong password
    type: "admin",
  } satisfies IShoppingMallAdmin.ILogin;

  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: loginInputWrongPassword,
    });
  });

  // 5. Attempt login with non-existent email
  const loginInputNonExistEmail = {
    email: `nonexist_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: adminPassword,
    type: "admin",
  } satisfies IShoppingMallAdmin.ILogin;

  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.admin.login(connection, {
      body: loginInputNonExistEmail,
    });
  });
}
