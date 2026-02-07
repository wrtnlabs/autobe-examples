import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_super_admin_email_verifications_create } from "../../../generate/generate_random_shopping_mall_super_admin_email_verifications_create";
import { prepare_random_shopping_mall_super_admin_email_verification } from "../../../prepare/prepare_random_shopping_mall_super_admin_email_verification";

export async function test_api_super_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account and verify email
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin =
    await api.functional.shoppingMall.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminJoin);
  // Verify super admin email
  const emailVerification =
    await generate_random_shopping_mall_super_admin_email_verifications_create(
      connection,
      {},
    );
  typia.assert(emailVerification);
  // Step 2: Login as super admin to establish initial authenticated session
  const superAdminLogin = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  typia.assert(superAdminLogin);
  // Step 3: Verify initial tokens are valid and session record exists
  TestValidator.equals(
    "initial access token exists",
    superAdminLogin.token.access !== "",
    true,
  );
  TestValidator.equals(
    "initial refresh token exists",
    superAdminLogin.token.refresh !== "",
    true,
  );
  TestValidator.predicate("access token has valid format", () =>
    /^[\w-]+\.[\w-]+\.[\w-]+$/.test(superAdminLogin.token.access),
  );
  TestValidator.predicate("refresh token has valid format", () =>
    /^[\w-]+\.[\w-]+\.[\w-]+$/.test(superAdminLogin.token.refresh),
  );
  // Step 4: Call refresh endpoint with current refresh token
  const superAdminRefreshConnection: api.IConnection = {
    host: connection.host,
  };
  superAdminRefreshConnection.headers = {
    Authorization: `Bearer ${superAdminLogin.token.refresh}`,
  };
  const superAdminRefresh = await authorize_super_admin_refresh(
    superAdminRefreshConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IRefresh>(),
    },
  );
  typia.assert(superAdminRefresh);
  // Step 5: Verify new access token works for authenticated requests
  const testConnection: api.IConnection = {
    host: connection.host,
  };
  testConnection.headers = {
    Authorization: `Bearer ${superAdminRefresh.token.access}`,
  };
  // Verify new access token is valid by calling an authenticated endpoint
  const refreshValidation =
    await api.functional.shoppingMall.auth.super_admin.refresh(testConnection, {
      body: typia.random<IShoppingMallSuperAdmin.IRefresh>(),
    });
  typia.assert(refreshValidation);
  // Step 6: Verify old refresh token is invalidated and new refresh token is provided
  TestValidator.equals(
    "new refresh token is different from old",
    superAdminRefresh.token.refresh !== superAdminLogin.token.refresh,
    true,
  );
  TestValidator.equals(
    "new access token is different from old",
    superAdminRefresh.token.access !== superAdminLogin.token.access,
    true,
  );
  // Step 7: Verify new access token has extended expiration time
  TestValidator.predicate(
    "new access token has future expiration",
    () => new Date(superAdminRefresh.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new refresh token has future expiration",
    () => new Date(superAdminRefresh.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "new expiration is later than initial",
    () =>
      new Date(superAdminRefresh.token.expired_at) >
      new Date(superAdminLogin.token.expired_at),
  );
}
