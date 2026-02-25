import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_reduce_to_zero(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create a product variant with some initial stock > 0
  const initialStock: number & tags.Type<"int32"> = 10;
  const variantBody: IShoppingMallProductVariant.ICreate = {
    skuCode: RandomGenerator.alphaNumeric(10),
    priceOverride: null,
    stockQuantity: initialStock,
  };
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      { body: variantBody, params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Adjust inventory with a negative delta equal to initial stock (reduce to zero)
  const inventoryHistoryBody1: IShoppingMallInventoryHistory.ICreate = {
    shoppingMallProductVariantId: variant.id,
    quantityDelta: -initialStock,
    reason: "test boundary reduction to zero",
  };
  const inventoryHistory =
    await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: inventoryHistoryBody1,
      },
    );
  typia.assert(inventoryHistory);
  // 5. Verify inventory updated to zero
  TestValidator.equals(
    "stock quantity after reduction",
    inventoryHistory.productVariant.stockQuantity,
    0,
  );
  // 6. Attempt to reduce below zero (should error)
  const inventoryHistoryBody2: IShoppingMallInventoryHistory.ICreate = {
    shoppingMallProductVariantId: variant.id,
    quantityDelta: -1,
    reason: "test below zero rejection",
  };
  await TestValidator.error(
    "reject inventory reduction below zero",
    async () => {
      await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: inventoryHistoryBody2,
        },
      );
    },
  );
}
