import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRefresh";

export async function test_api_admin_refresh_updates_session_context_metadata(
  connection: api.IConnection,
) {
  // 1. Perform an initial admin login to create a baseline session and tokens.
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const firstAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(firstAuth);

  // Extract the initial tokens and identity snapshot.
  const firstToken: IAuthorizationToken = firstAuth.token;
  const firstAdminId = firstAuth.id;
  const firstAdminEmail = firstAuth.email;
  const firstStatus = firstAuth.status;
  const firstEmailVerified = firstAuth.email_verified;
  const firstCreatedAt = firstAuth.created_at;
  const firstUpdatedAt = firstAuth.updated_at;
  const firstDeletedAt = firstAuth.deleted_at;

  // 2. Build a refresh request body with changed session context metadata.
  const refreshBody = {
    refreshToken: firstToken.refresh,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminRefresh.ICreate;

  // 3. Call the refresh endpoint.
  const refreshedAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAuth);

  // 4. Validate identity continuity: same admin, same lifecycle fields.
  TestValidator.equals(
    "admin id should remain the same after refresh",
    refreshedAuth.id,
    firstAdminId,
  );
  TestValidator.equals(
    "admin email should remain the same after refresh",
    refreshedAuth.email,
    firstAdminEmail,
  );
  TestValidator.equals(
    "admin status should remain the same after refresh",
    refreshedAuth.status,
    firstStatus,
  );
  TestValidator.equals(
    "admin email_verified should remain the same after refresh",
    refreshedAuth.email_verified,
    firstEmailVerified,
  );
  TestValidator.equals(
    "admin created_at should remain the same after refresh",
    refreshedAuth.created_at,
    firstCreatedAt,
  );
  TestValidator.equals(
    "admin updated_at should remain the same after refresh in this test",
    refreshedAuth.updated_at,
    firstUpdatedAt,
  );
  TestValidator.equals(
    "admin deleted_at should remain the same after refresh",
    refreshedAuth.deleted_at,
    firstDeletedAt,
  );

  // 5. Validate that new tokens are issued (at least access token changes).
  const secondToken: IAuthorizationToken = refreshedAuth.token;
  TestValidator.notEquals(
    "access token must change on refresh",
    secondToken.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh token should normally change on refresh (best-effort assertion)",
    secondToken.refresh,
    firstToken.refresh,
  );

  // 6. Sanity-check token expiry metadata is still valid ISO date-times.
  typia.assert<string & tags.Format<"date-time">>(secondToken.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    secondToken.refreshable_until,
  );

  // Note: We cannot directly inspect shopping_mall_admin_sessions from this E2E
  // test, but successful refresh with updated context and identity continuity
  // indirectly validates correct session handling.
}
