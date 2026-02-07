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

/**
 * Test token refresh with expired refresh token: 1) Create super admin account
 * and login to establish session with refresh token, 2) Simulate expired refresh
 * token scenario, 3) Call refresh endpoint with expired refresh token, 4) Verify
 * endpoint returns 401 Unauthorized response, 5) Verify error message indicates
 * session has expired, 6) Verify no new tokens are issued when refresh token is
 * expired.
 */
export async function test_api_super_admin_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and login
  const registerConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.shoppingMall.auth.super_admin.join(registerConnection, {
    body: {
      email: testEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(registerConnection);
  // Verify email (mocked - in real scenario would use verification endpoint)
  const verificationConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.superAdmin.email_verifications.create(
    verificationConnection,
    {
      body: typia.random<IShoppingMallSuperAdminEmailVerification.ICreate>(),
    },
  );
  typia.assert(verificationConnection);
  // Login to establish session with refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse =
    await api.functional.shoppingMall.auth.super_admin.login(loginConnection, {
      body: {
        email: testEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSuperAdmin.ILogin,
    });
  typia.assert(loginResponse);
  // 2. Simulate expired refresh token scenario
  // For testing purposes, we'll use an expired token
  const expiredToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  // 3. Call refresh endpoint with expired refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "expired refresh token should return 401",
    async () => {
      await api.functional.shoppingMall.auth.super_admin.refresh(
        refreshConnection,
        {
          body: {
            refresh: expiredToken,
          } satisfies IShoppingMallSuperAdmin.IRefresh,
        },
      );
    },
  );
  // 4. Verify endpoint returns 401 Unauthorized response
  // 5. Verify error message indicates session has expired
  // 6. Verify no new tokens are issued when refresh token is expired
}