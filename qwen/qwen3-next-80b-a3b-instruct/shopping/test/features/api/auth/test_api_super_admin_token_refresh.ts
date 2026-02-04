import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_super_admin_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new superAdmin account using authorize utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Create a new connection for refresh operation using the refresh token from join result
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_refresh(refreshConnection, {
      body: {
        refreshToken: superAdmin.token.refresh,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    });
  typia.assert(refreshed);
  // Step 3: Validate the refresh operation
  // - New access token issued
  TestValidator.notEquals(
    "new access token generated",
    superAdmin.token.access,
    refreshed.token.access,
  );
  // - Token metadata updated
  TestValidator.predicate(
    "access token expired_at is newer than original",
    new Date(refreshed.token.expired_at) >
      new Date(superAdmin.token.expired_at),
  );
  // - Refresh token remains unchanged (validity maintained)
  TestValidator.equals(
    "refresh token unchanged",
    superAdmin.token.refresh,
    refreshed.token.refresh,
  );
  // - Refreshable_until remains the same (session lifetime unchanged)
  TestValidator.equals(
    "refreshable_until unchanged",
    superAdmin.token.refreshable_until,
    refreshed.token.refreshable_until,
  );
  // - SuperAdmin identity unchanged
  TestValidator.equals("superAdmin ID unchanged", superAdmin.id, refreshed.id);
  TestValidator.equals(
    "superAdmin email unchanged",
    superAdmin.email,
    refreshed.email,
  );
  // - Refresh operation maintains authentication state (no logout)
  TestValidator.equals(
    "adminType unchanged",
    superAdmin.adminType,
    refreshed.adminType,
  );
}
