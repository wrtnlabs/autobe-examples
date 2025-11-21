import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_success_active(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "super_admin" as const,
  };

  // 1. Create a new admin account with 'active' status
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: admin,
    });
  typia.assert(createdAdmin);

  // 2. Perform successful admin login with the created credentials
  const loginResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: admin.email,
        password_hash: admin.password,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(loginResponse);

  // 3. Validate the login response contains expected data
  TestValidator.equals(
    "admin email matches created account",
    loginResponse.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin first_name matches created account",
    loginResponse.first_name,
    createdAdmin.first_name,
  );
  TestValidator.equals(
    "admin last_name matches created account",
    loginResponse.last_name,
    createdAdmin.last_name,
  );
  TestValidator.equals(
    "admin role matches created account",
    loginResponse.role,
    createdAdmin.role,
  );
  TestValidator.equals(
    "admin status is active",
    loginResponse.status,
    "active",
  );
  TestValidator.predicate(
    "access token exists",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(loginResponse.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(loginResponse.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
