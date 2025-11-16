import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_authentication(
  connection: api.IConnection,
) {
  // 1. Create a new admin user using /auth/admin/join
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: typia.random<string>(),
    password: "Password!23", // use a fixed strong password to test login
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const created: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Log in with the created admin user credentials via /auth/admin/login
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
    href: "https://admin.shoppingmall.com/login",
    referrer: "https://admin.shoppingmall.com",
    ip: null,
  } satisfies IShoppingMallAdmin.ILogin;

  const loggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Validate the login result matches created user info
  TestValidator.equals("authorized admin id matches", loggedIn.id, created.id);
  TestValidator.equals(
    "authorized admin email matches",
    loggedIn.email,
    created.email,
  );
  TestValidator.equals(
    "authorized admin role matches",
    loggedIn.role,
    created.role,
  );
  TestValidator.equals("authorized admin is active", loggedIn.is_active, true);
  TestValidator.predicate(
    "login token access string nonempty",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh string nonempty",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token expiration datetime valid",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login token refreshable until datetime valid",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );
}
