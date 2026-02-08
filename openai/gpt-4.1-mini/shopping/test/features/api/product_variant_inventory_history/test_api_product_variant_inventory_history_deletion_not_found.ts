import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_inventory_history_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and obtains authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(connection, {
    body: {}, // Use empty object as IShoppingMallSeller.IJoin is empty
  });
  sellerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create a new product to get productId
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: undefined, // Use defaults
    },
  );
  typia.assert(product);
  const productEntity = product as IEntity & IShoppingMallProduct;
  // 3. Create a product variant under the product to get variantId
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: productEntity.id },
        body: undefined, // Use defaults
      },
    );
  typia.assert(variant);
  const variantEntity = variant as IEntity & IShoppingMallProductVariant;
  // 4. Attempt deleting a non-existent (random) inventoryHistoryId
  //    Expect HTTP 404 Not Found error
  const randomInventoryHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existent inventory history returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.productVariants.inventoryHistories.eraseInventoryHistory(
        sellerConnection,
        {
          variantId: variantEntity.id,
          inventoryHistoryId: randomInventoryHistoryId,
        },
      );
    },
  );
}
