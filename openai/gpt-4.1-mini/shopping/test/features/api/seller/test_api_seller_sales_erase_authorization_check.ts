import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sales_erase_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  /*
     Test to verify authorization check for deleting sales listings.
     Only the seller who owns a sale listing can delete it.
     Steps:
     1. Register Seller A and obtain authorized connection.
     2. Register Seller B and obtain authorized connection.
     3. Seller A creates a sale listing.
     4. Seller B attempts to delete Seller A's sale listing and should fail.
     5. Seller A deletes their own sale listing successfully.
    */
  // 1. Seller A registration and authorization
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoinOutput = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "SellerA Shop",
      shopDescription: "Shop of Seller A",
      logoUri: null,
    },
  });
  sellerAConnection.headers = { Authorization: sellerAJoinOutput.token.access };
  // 2. Seller B registration and authorization
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoinOutput = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      shopName: "SellerB Shop",
      shopDescription: "Shop of Seller B",
      logoUri: null,
    },
  });
  sellerBConnection.headers = { Authorization: sellerBJoinOutput.token.access };
  // 3. Seller A creates a new sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerAConnection,
    {
      body: {
        name: "Exclusive Item A",
        description: "Description for Exclusive Item A",
        base_price: 5000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  // 4. Seller B attempts to delete Seller A's sale listing, expect failure
  await TestValidator.error(
    "Unauthorized seller cannot delete another seller's sale",
    async () => {
      await api.functional.shoppingMall.seller.sales.erase(sellerBConnection, {
        saleId: sale.id,
      });
    },
  );
  // 5. Seller A deletes their own sale listing successfully
  await api.functional.shoppingMall.seller.sales.erase(sellerAConnection, {
    saleId: sale.id,
  });
}
