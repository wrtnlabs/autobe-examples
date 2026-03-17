import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_unban_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name();
  const sellerJoinResult = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: sellerShopName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 3. Ban the seller using admin connection
  const banResult = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId },
  );
  typia.assert(banResult);
  TestValidator.equals(
    "seller is banned after ban operation",
    banResult.isBanned,
    true,
  );
  // 4. Unban the seller using admin connection
  const unbanResult = await api.functional.shoppingMall.admin.sellers.unban(
    adminConnection,
    { sellerId },
  );
  typia.assert(unbanResult);
  // 5. Validate response fields
  TestValidator.equals("seller id matches", unbanResult.id, sellerId);
  TestValidator.equals("seller email matches", unbanResult.email, sellerEmail);
  TestValidator.equals(
    "seller shopName matches",
    unbanResult.shopName,
    sellerShopName,
  );
  TestValidator.equals(
    "isBanned is false after unban",
    unbanResult.isBanned,
    false,
  );
  TestValidator.equals(
    "isSuspended remains false",
    unbanResult.isSuspended,
    false,
  );
  TestValidator.equals("deletedAt is null", unbanResult.deletedAt, null);
  TestValidator.predicate(
    "updatedAt is at or after createdAt",
    new Date(unbanResult.updatedAt) >= new Date(unbanResult.createdAt),
  );
}
