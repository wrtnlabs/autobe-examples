import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_ban_already_banned_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create seller connection and register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // Step A: First ban - should succeed and return isBanned: true
  const firstBanResult =
    await api.functional.shoppingMall.superAdmin.sellers.ban(
      superAdminConnection,
      { sellerId },
    );
  typia.assert(firstBanResult);
  TestValidator.equals(
    "first ban sets isBanned to true",
    firstBanResult.isBanned,
    true,
  );
  // Step B: Second ban - should be rejected (already banned)
  await TestValidator.error(
    "second ban on already-banned seller should fail",
    async () => {
      await api.functional.shoppingMall.superAdmin.sellers.ban(
        superAdminConnection,
        { sellerId },
      );
    },
  );
}
