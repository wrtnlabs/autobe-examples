import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate the login functionality for an existing admin account.
 *
 * This test verifies that after registering a new admin via /auth/admin/join, a
 * login attempt using the correct email and password yields a valid
 * IShoppingAdmin.IAuthorized response envelope (including JWT access/refresh
 * tokens), and that authentication fails for invalid credentials and when
 * status is not 'active'.
 *
 * Steps:
 *
 * 1. Register a random admin (with status = 'active')
 * 2. Login with correct email/password; validate tokens and session fields
 * 3. Login with wrong password; expect error
 * 4. Register suspended admin; login attempt fails
 */
export async function test_api_admin_login_existing(
  connection: api.IConnection,
) {
  // Step 1: Register a random admin (status active)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminData = {
    email: adminEmail,
    password: adminPassword satisfies string as string,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "support", "operator"] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin status is active", admin.status, "active");
  TestValidator.equals("authorized structure has token", !!admin.token, true);
  typia.assert<IShoppingAuthorizationToken>(admin.token);

  // Step 2: Successful login with correct credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingAdmin.ILogin;
  const loginResult: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginResult);
  TestValidator.equals("login email matches", loginResult.email, adminEmail);
  typia.assert<IShoppingAuthorizationToken>(loginResult.token);
  TestValidator.notEquals(
    "new token after login",
    admin.token.access,
    loginResult.token.access,
  );

  // Step 3: Login with wrong password (should fail)
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        ...loginBody,
        password: adminPassword + "X",
      } satisfies IShoppingAdmin.ILogin,
    });
  });

  // Step 4: Register new admin (non-active), then login fails
  const suspendedEmail = typia.random<string & tags.Format<"email">>();
  const suspendedPassword = RandomGenerator.alphaNumeric(14);
  const suspendedAdminData = {
    email: suspendedEmail,
    password: suspendedPassword satisfies string as string,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "operator", "support"] as const),
    status: "suspended",
  } satisfies IShoppingAdmin.IJoin;
  const suspendedAdmin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: suspendedAdminData,
    });
  typia.assert(suspendedAdmin);
  TestValidator.equals(
    "suspended admin email matches",
    suspendedAdmin.email,
    suspendedEmail,
  );
  TestValidator.equals(
    "suspended admin status",
    suspendedAdmin.status,
    "suspended",
  );
  await TestValidator.error("login fails for suspended admin", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: suspendedEmail,
        password: suspendedPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingAdmin.ILogin,
    });
  });
}
