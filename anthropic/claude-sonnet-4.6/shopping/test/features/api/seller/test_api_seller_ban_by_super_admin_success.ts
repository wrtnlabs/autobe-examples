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

export async function test_api_seller_ban_by_super_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
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
  // 3. Verify the seller's initial state
  TestValidator.predicate(
    "seller initial isBanned is false",
    sellerAuthorized.seller.isBanned === false,
  );
  TestValidator.predicate(
    "seller initial isSuspended is false",
    sellerAuthorized.seller.isSuspended === false,
  );
  TestValidator.equals(
    "seller initial deletedAt is null",
    sellerAuthorized.seller.deletedAt,
    null,
  );
  const originalSeller = sellerAuthorized.seller;
  // 4. Ban the seller using the superAdmin connection
  const bannedSeller = await api.functional.shoppingMall.superAdmin.sellers.ban(
    superAdminConnection,
    {
      sellerId: originalSeller.id,
    },
  );
  typia.assert(bannedSeller);
  // 5. Validate ban result
  TestValidator.equals(
    "seller isBanned is now true",
    bannedSeller.isBanned,
    true,
  );
  TestValidator.equals(
    "seller id unchanged",
    bannedSeller.id,
    originalSeller.id,
  );
  TestValidator.equals(
    "seller email unchanged",
    bannedSeller.email,
    originalSeller.email,
  );
  TestValidator.equals(
    "seller shopName unchanged",
    bannedSeller.shopName,
    originalSeller.shopName,
  );
  TestValidator.equals(
    "seller isSuspended unchanged",
    bannedSeller.isSuspended,
    originalSeller.isSuspended,
  );
  TestValidator.equals(
    "seller createdAt unchanged",
    bannedSeller.createdAt,
    originalSeller.createdAt,
  );
  TestValidator.equals(
    "seller deletedAt still null",
    bannedSeller.deletedAt,
    null,
  );
  // 6. Post-ban verification: banned seller cannot login
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("banned seller cannot login", async () => {
    await authorize_seller_login(loginConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
}
