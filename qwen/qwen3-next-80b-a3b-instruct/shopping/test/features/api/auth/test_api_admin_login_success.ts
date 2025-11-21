import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "Password123!",
  } satisfies IShoppingMallAdmin.IRequest;

  // Create admin account first
  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminCredentials.email,
      password: "Password123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Ensure account is active
  TestValidator.equals(
    "admin account status should be active",
    createdAdmin.status,
    "active",
  );

  // Attempt login with valid credentials
  const loggedinAdmin = await api.functional.auth.admin.login(connection, {
    body: adminCredentials,
  });
  typia.assert(loggedinAdmin);

  // Validate login response contains required fields
  TestValidator.equals(
    "login email matches created email",
    loggedinAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "login first_name matches created first_name",
    loggedinAdmin.first_name,
    createdAdmin.first_name,
  );
  TestValidator.equals(
    "login last_name matches created last_name",
    loggedinAdmin.last_name,
    createdAdmin.last_name,
  );
  TestValidator.equals(
    "login role matches created role",
    loggedinAdmin.role,
    createdAdmin.role,
  );
  TestValidator.equals(
    "login status should be active",
    loggedinAdmin.status,
    "active",
  );
  TestValidator.predicate(
    "token access should exist",
    () => loggedinAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should exist",
    () => loggedinAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at should be valid date-time",
    () =>
      loggedinAdmin.token.expired_at &&
      typia.is<string & tags.Format<"date-time">>(
        loggedinAdmin.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token refreshable_until should be valid date-time",
    () =>
      loggedinAdmin.token.refreshable_until &&
      typia.is<string & tags.Format<"date-time">>(
        loggedinAdmin.token.refreshable_until,
      ),
  );
}
