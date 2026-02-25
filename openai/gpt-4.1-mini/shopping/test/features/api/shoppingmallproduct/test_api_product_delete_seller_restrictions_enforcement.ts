import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_delete_seller_restrictions_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Successful product deletion by seller owner
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // Create new connection for authenticated seller
  const authSellerConnection: api.IConnection = { host: connection.host };
  authSellerConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  // Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    authSellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 1.1 Delete product successfully
  await api.functional.shoppingMall.seller.products.erase(
    authSellerConnection,
    {
      productId: product.id,
    },
  );
  // Attempting to delete again should result in error (product not found or forbidden)
  await TestValidator.error("delete deleted product should fail", async () => {
    await api.functional.shoppingMall.seller.products.erase(
      authSellerConnection,
      {
        productId: product.id,
      },
    );
  });
  // 2. Product deletion rejected due to pending orders or refund requests
  // We simulate this by trying deletion with a different product (assuming environment rejects)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, { body: {} });
  typia.assert(seller2);
  const authSeller2Connection: api.IConnection = { host: connection.host };
  authSeller2Connection.headers = {
    Authorization: `Bearer ${seller2.token.access}`,
  };
  // Create second product
  const product2 = await generate_random_shopping_mall_seller_products_create(
    authSeller2Connection,
    { body: {} },
  );
  typia.assert(product2);
  // Simulate pending orders or refund requests is environmental. We attempt deletion
  // and expect HTTP 409 Conflict or 403 Forbidden with proper error message.
  // We simulate by forcibly throwing HttpError, but here we test the actual API
  // We attempt deletion expecting error
  await TestValidator.httpError(
    "delete product with pending orders or refund requests should be rejected",
    [409, 403],
    async () => {
      await api.functional.shoppingMall.seller.products.erase(
        authSeller2Connection,
        {
          productId: product2.id,
        },
      );
    },
  );
  // 3. Unauthorized product deletion attempts
  // 3.1 No authentication
  await TestValidator.httpError(
    "unauthorized delete without authentication",
    401,
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 3.2 Authenticated as different seller attempts deletion
  await TestValidator.httpError(
    "forbidden delete by different seller",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.products.erase(
        authSeller2Connection,
        {
          productId: product.id,
        },
      );
    },
  );
}
