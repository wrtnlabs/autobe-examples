import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  const password: string = RandomGenerator.alphaNumeric(12);
  const admin: ITodoAppAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: password,
    role: "admin",
  };

  const createdAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: admin,
    });
  typia.assert(createdAdmin);

  const loginBody: ITodoAppAdmin.IAuth = {
    email: createdAdmin.email,
    password: password,
    ip: "127.0.0.1",
    href: "https://todoapp.com/login",
    referrer: "https://todoapp.com/",
  };

  const loggedAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedAdmin);

  const refreshBody: ITodoAppAdmin.IRefresh = {
    refreshToken: loggedAdmin.token.refresh,
  };

  const refreshedAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAdmin);

  // Verify admin identity is preserved
  TestValidator.equals(
    "admin ID preserved",
    refreshedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "admin email preserved",
    refreshedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin role preserved",
    refreshedAdmin.role,
    createdAdmin.role,
  );

  // Verify new token is issued
  TestValidator.notEquals(
    "access token changed",
    refreshedAdmin.token.access,
    loggedAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshedAdmin.token.refresh,
    loggedAdmin.token.refresh,
  );

  // Verify token expiration times are set correctly
  TestValidator.predicate(
    "new access token expired_at is set",
    refreshedAdmin.token.expired_at !== null,
  );
  TestValidator.predicate(
    "new refresh token refreshable_until is set",
    refreshedAdmin.token.refreshable_until !== null,
  );
}
