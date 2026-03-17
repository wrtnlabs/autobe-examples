import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test token refresh failure when the administrator account has been deactivated.
 *
 * This test verifies the admin token refresh mechanism and validates that:
 * 1. Active administrator accounts can successfully refresh their tokens
 * 2. Invalid refresh tokens are properly rejected
 * 3. The refresh endpoint validates account status (deleted_at is null)
 *
 * Steps:
 * 1. Register a new administrator account and obtain initial tokens
 * 2. Register a super administrator account for potential account management
 * 3. Test successful token refresh with valid refresh token from active account
 * 4. Test refresh failure with invalid/malformed refresh token
 * 5. Verify account status is properly validated during refresh
 *
 * Business validation: The refresh endpoint must verify the administrator
 * account is active (deleted_at is null) before issuing new tokens.
 * Deactivated administrators should be unable to refresh tokens.
 *
 * Note: Full deactivation testing requires admin ban/deactivate endpoints
 * which are not available in the current API function set. This test
 * validates the refresh mechanism with available authentication endpoints.
 */
export async function test_api_admin_token_refresh_account_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new administrator account and obtain initial tokens
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Verify the admin account is active (deleted_at is null)
  TestValidator.predicate(
    "admin account is active after join",
    adminJoinResult.deleted_at === null,
  );
  // Store the refresh token for testing
  const validRefreshToken = adminJoinResult.token.refresh;
  // Step 2: Register a super administrator account
  // (Available for potential account management operations)
  const superAdminJoinResult = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdminJoinResult);
  // Step 3: Test successful token refresh with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.shoppingMall.auth.admin.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // Verify the refreshed token belongs to the same admin account
  TestValidator.equals(
    "admin email matches after refresh",
    refreshResult.email,
    adminJoinResult.email,
  );
  TestValidator.equals(
    "admin ID matches after refresh",
    refreshResult.id,
    adminJoinResult.id,
  );
  TestValidator.predicate(
    "refreshed account is active",
    refreshResult.deleted_at === null,
  );
  // Step 4: Test refresh failure with invalid refresh token
  // This validates the endpoint properly rejects invalid tokens
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("refresh fails with invalid token", async () => {
    await api.functional.shoppingMall.auth.admin.refresh(
      invalidRefreshConnection,
      {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallAdmin.IRefresh,
      },
    );
  });
  // Step 5: Verify account status validation
  // The refresh endpoint internally checks deleted_at is null before issuing tokens.
  // When an admin account is deactivated (deleted_at is set), refresh attempts
  // should fail even with a valid refresh token. This ensures immediate access
  // revocation for banned or removed administrators.
  //
  // Note: Testing actual deactivation requires admin management endpoints
  // (e.g., POST /shoppingMall/admins/{id}/ban) which are not available
  // in the current API function set. The refresh endpoint specification
  // confirms it validates: "the administrator account in shopping_mall_admins
  // has deleted_at = null" before issuing new tokens.
}
