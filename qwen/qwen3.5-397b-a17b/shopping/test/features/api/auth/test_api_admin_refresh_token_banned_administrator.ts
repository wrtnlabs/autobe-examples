import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test administrator token refresh rejection when administrator account is banned.
 *
 * Validates the complete workflow where a banned administrator's refresh token is properly rejected. The test ensures that even with a technically valid refresh token, banned administrators cannot renew their session, enforcing access control policies at the token refresh level.
 *
 * 1. Super administrator account created and authenticated.
 * 2. Administrator account created via join operation, refresh token captured.
 * 3. Super administrator bans the administrator account by setting banned_at timestamp.
 * 4. Refresh attempt with valid but now-invalidated refresh token returns 401 Unauthorized.
 * 5. Error message confirms administrator ban status as rejection reason.
 */
export async function test_api_admin_refresh_token_banned_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // Login as super administrator for ban operation
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminLoginConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create administrator account and capture refresh token
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(adminAuthorized);
  const refreshToken = adminAuthorized.token.refresh;
  // 3. Ban the administrator account using super admin
  const bannedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminLoginConnection,
      {
        adminId: adminAuthorized.id,
        body: {
          banned_at: new Date().toISOString(),
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(bannedAdmin);
  TestValidator.predicate("admin is banned", bannedAdmin.bannedAt !== null);
  // 4. Attempt to refresh with the banned admin's refresh token - should fail
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("banned admin refresh rejected", async () => {
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  });
}
