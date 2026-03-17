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

export async function test_api_seller_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a seller with known credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerShopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      shop_name: sellerShopName,
    },
  });
  typia.assert(authorized);
  const sellerId = authorized.id;
  // Step 2: Retrieve the seller profile via the public endpoint (no auth)
  const publicConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.shoppingMall.sellers.at(
    publicConnection,
    {
      sellerId,
    },
  );
  typia.assert(seller);
  // Step 3: Validate that the returned profile matches the registered seller
  TestValidator.equals("seller id matches", seller.id, sellerId);
  TestValidator.equals("seller email matches", seller.email, sellerEmail);
  TestValidator.equals(
    "seller shopName matches",
    seller.shopName,
    sellerShopName,
  );
  TestValidator.equals(
    "seller isBanned is false for new seller",
    seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller isSuspended is false for new seller",
    seller.isSuspended,
    false,
  );
  TestValidator.equals(
    "seller deletedAt is null for active seller",
    seller.deletedAt,
    null,
  );
  // Step 4: Edge case - non-existent sellerId should return 404
  await TestValidator.error("non-existent sellerId returns error", async () => {
    await api.functional.shoppingMall.sellers.at(publicConnection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
