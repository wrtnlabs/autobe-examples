import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRefresh";

export async function test_api_admin_refresh_success_with_valid_session(
  connection: api.IConnection,
) {
  // 1. Perform initial admin login to establish a valid session and token pair
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(loginAuthorized);

  const originalToken: IAuthorizationToken = loginAuthorized.token;

  // 2. Build refresh request body using the refresh token from login
  const refreshBody = {
    refreshToken: originalToken.refresh,
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminRefresh.ICreate;

  // 3. Call refresh endpoint
  const refreshedAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(refreshedAuthorized);

  const refreshedToken: IAuthorizationToken = refreshedAuthorized.token;

  // 4. Core identity invariants between login and refresh
  TestValidator.equals(
    "admin id must remain the same after refresh",
    refreshedAuthorized.id,
    loginAuthorized.id,
  );
  TestValidator.equals(
    "admin email must remain the same after refresh",
    refreshedAuthorized.email,
    loginAuthorized.email,
  );
  TestValidator.equals(
    "admin status must remain the same after refresh",
    refreshedAuthorized.status,
    loginAuthorized.status,
  );
  TestValidator.equals(
    "admin email_verified must remain the same after refresh",
    refreshedAuthorized.email_verified,
    loginAuthorized.email_verified,
  );
  TestValidator.equals(
    "admin created_at must remain the same after refresh",
    refreshedAuthorized.created_at,
    loginAuthorized.created_at,
  );
  TestValidator.equals(
    "admin deleted_at must remain the same after refresh",
    refreshedAuthorized.deleted_at,
    loginAuthorized.deleted_at,
  );

  // updated_at may advance or remain the same but must not go backwards
  const loginUpdatedAt = new Date(loginAuthorized.updated_at).getTime();
  const refreshedUpdatedAt = new Date(refreshedAuthorized.updated_at).getTime();
  TestValidator.predicate(
    "admin updated_at must not move backwards after refresh",
    refreshedUpdatedAt >= loginUpdatedAt,
  );

  // 5. If embedded admin summaries are present in both, ensure they are consistent
  if (loginAuthorized.admin && refreshedAuthorized.admin) {
    TestValidator.equals(
      "summary.id must remain the same",
      refreshedAuthorized.admin.id,
      loginAuthorized.admin.id,
    );
    TestValidator.equals(
      "summary.email must remain the same",
      refreshedAuthorized.admin.email,
      loginAuthorized.admin.email,
    );
    TestValidator.equals(
      "summary.status must remain the same",
      refreshedAuthorized.admin.status,
      loginAuthorized.admin.status,
    );
    TestValidator.equals(
      "summary.email_verified must remain the same",
      refreshedAuthorized.admin.email_verified,
      loginAuthorized.admin.email_verified,
    );
    TestValidator.equals(
      "summary.created_at must remain the same",
      refreshedAuthorized.admin.created_at,
      loginAuthorized.admin.created_at,
    );
    TestValidator.equals(
      "summary.updated_at must remain the same",
      refreshedAuthorized.admin.updated_at,
      loginAuthorized.admin.updated_at,
    );
    TestValidator.equals(
      "summary.deleted_at must remain the same",
      refreshedAuthorized.admin.deleted_at,
      loginAuthorized.admin.deleted_at,
    );
  }

  // 6. Token rotation semantics
  TestValidator.notEquals(
    "access token must rotate on refresh",
    refreshedToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token must rotate on refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );

  const originalExpiredAt = new Date(originalToken.expired_at).getTime();
  const refreshedExpiredAt = new Date(refreshedToken.expired_at).getTime();
  const originalRefreshableUntil = new Date(
    originalToken.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed access token expiry must not be earlier than original",
    refreshedExpiredAt >= originalExpiredAt,
  );
  TestValidator.predicate(
    "refreshed refreshable_until must not be earlier than original",
    refreshedRefreshableUntil >= originalRefreshableUntil,
  );
}
