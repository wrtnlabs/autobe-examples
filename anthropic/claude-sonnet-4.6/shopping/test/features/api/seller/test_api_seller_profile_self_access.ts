import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_self_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAShopName = RandomGenerator.name();
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: sellerAShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 2. Register Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 3. Self-access (success path): Seller A retrieves own profile
  const sellerAProfile = await api.functional.shoppingMall.sellers.at(
    sellerAConnection,
    { sellerId: sellerAAuth.id },
  );
  typia.assert(sellerAProfile);
  // Validate returned profile matches registration data
  TestValidator.equals(
    "id matches Seller A",
    sellerAProfile.id,
    sellerAAuth.id,
  );
  TestValidator.equals(
    "email matches Seller A",
    sellerAProfile.email,
    sellerAEmail,
  );
  TestValidator.equals(
    "shopName matches Seller A",
    sellerAProfile.shopName,
    sellerAShopName,
  );
  TestValidator.equals("isBanned is false", sellerAProfile.isBanned, false);
  TestValidator.equals(
    "isSuspended is false",
    sellerAProfile.isSuspended,
    false,
  );
  TestValidator.equals("deletedAt is null", sellerAProfile.deletedAt, null);
  // 4. Cross-seller access (forbidden path): Seller A tries to access Seller B's profile
  await TestValidator.error(
    "Seller A cannot access Seller B's profile",
    async () => {
      await api.functional.shoppingMall.sellers.at(sellerAConnection, {
        sellerId: sellerBAuth.id,
      });
    },
  );
}
