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

export async function test_api_seller_ban_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Register a new seller account - keep credentials for later login attempt
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.seller.id;
  const originalUpdatedAt = sellerAuthorized.seller.updatedAt;
  const originalIsSuspended = sellerAuthorized.seller.isSuspended;
  const originalEmail = sellerAuthorized.seller.email;
  // 3. Admin bans the seller
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(bannedSeller);
  // 4. Validate the ban response
  TestValidator.equals("seller id matches", bannedSeller.id, sellerId);
  TestValidator.equals(
    "seller email matches",
    bannedSeller.email,
    originalEmail,
  );
  TestValidator.predicate("isBanned is true", bannedSeller.isBanned === true);
  TestValidator.equals(
    "isSuspended unchanged",
    bannedSeller.isSuspended,
    originalIsSuspended,
  );
  TestValidator.equals("deletedAt is null", bannedSeller.deletedAt, null);
  TestValidator.predicate(
    "updatedAt is gte original",
    new Date(bannedSeller.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 5. Post-ban login verification: banned seller should not be able to log in
  const bannedSellerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error("banned seller cannot login", async () => {
    await authorize_seller_login(bannedSellerLoginConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
}
