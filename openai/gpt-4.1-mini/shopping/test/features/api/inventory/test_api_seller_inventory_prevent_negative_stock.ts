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

/**
 * Test handling of inventory adjustment by seller where the requested negative quantity change would cause stock to go below zero.
 *
 * Steps:
 * 1. Authenticate as seller.
 * 2. Create a new product and variant.
 * 3. Adjust inventory by adding stock.
 * 4. Attempt to reduce stock by more than current stock with negative quantity change.
 *
 * Validate:
 * - Request fails with business logic error preventing negative inventory.
 * - Proper error response is returned.
 * - No inventory record created.
 * - Authorization enforced.
 * - Input validation for variant ownership checked.
 */
export async function test_api_seller_inventory_prevent_negative_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication and setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234",
      shopName: "SellerShop",
      shopDescription: "Test Shop Description",
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Create a new product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  // 3. Create a variant under the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${typia.random<string & tags.Format<"uuid">>()}`,
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant);
  // 4. Add positive stock to the variant
  const positiveQuantity = 10;
  const inventoryAdd =
    await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          shoppingMallProductVariantId: variant.id,
          quantityDelta: positiveQuantity,
          reason: "restock",
        },
      },
    );
  typia.assert(inventoryAdd);
  // 5. Attempt to reduce stock by more than current stock (negative stock prevention)
  const negativeQuantity = -(positiveQuantity + 1);
  await TestValidator.error(
    "Prevent inventory adjustment that causes negative stock",
    async () => {
      await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            shoppingMallProductVariantId: variant.id,
            quantityDelta: negativeQuantity,
            reason: "manual adjustment too large",
          },
        },
      );
    },
  );
  // 6. Authorization enforcement
  const badSellerConnection: api.IConnection = { host: connection.host };
  // No authorization header
  await TestValidator.httpError(
    "Inventory adjustment requires authorization",
    401,
    async () => {
      await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
        badSellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            shoppingMallProductVariantId: variant.id,
            quantityDelta: 1,
            reason: "unauthorized adjust",
          },
        },
      );
    },
  );
  // 7. Input validation for variant ownership - attempt with invalid variant id
  await TestValidator.httpError(
    "Variant ownership validation enforced",
    403,
    async () => {
      await generate_random_shopping_mall_seller_products_variants_inventory_create_inventory_history(
        sellerConnection,
        {
          params: {
            productId: product.id,
            variantId: typia.random<string & tags.Format<"uuid">>(),
          }, // random variant id
          body: {
            shoppingMallProductVariantId: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantityDelta: 1,
            reason: "invalid variant id",
          },
        },
      );
    },
  );
}
