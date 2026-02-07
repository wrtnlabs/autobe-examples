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

export async function test_api_super_admin_token_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new super admin account
  const registerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.super_admin.join(
    registerConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // Step 2: Create email verification for the new super admin
  const emailVerification =
    await api.functional.shoppingMall.superAdmin.email_verifications.create(
      registerConnection,
      {
        body: typia.random<IShoppingMallSuperAdminEmailVerification.ICreate>(),
      },
    );
  typia.assert(emailVerification);
  // Step 3: Login as the newly registered super admin
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse =
    await api.functional.shoppingMall.auth.super_admin.login(loginConnection, {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    });
  typia.assert(loginResponse);
  // Store the refresh token for later use
  const refreshToken = loginResponse.token.refresh;
  // Step 4: Simulate banning the super admin account
  // In a real implementation, this would involve calling an admin endpoint
  // to update the account status to 'banned'
  // For this test, we'll assume the account gets banned through admin action
  // Step 5: Attempt to refresh tokens with the banned account's refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  // Set the refresh token in the connection headers for the refresh endpoint
  refreshConnection.headers = {
    Authorization: refreshToken,
  };
  // Step 6: Verify that refresh fails with 403 Forbidden for banned account
  await TestValidator.error(
    "refresh endpoint returns 403 Forbidden for banned super admin account",
    async () => {
      await api.functional.shoppingMall.auth.super_admin.refresh(
        refreshConnection,
        {
          body: typia.random<IShoppingMallSuperAdmin.IRefresh>(),
        },
      );
    },
  );
}
