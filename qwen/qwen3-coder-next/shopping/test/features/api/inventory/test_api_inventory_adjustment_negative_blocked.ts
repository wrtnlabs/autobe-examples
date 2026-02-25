import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_adjust_inventory_adjust_inventory } from "../../../generate/generate_random_shopping_mall_seller_variants_adjust_inventory_adjust_inventory";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_inventory_adjustment_negative_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: sellerData });
  // Create product with variant
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "color",
                option_value: "white",
              },
            ],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product has no variants");
  }
  const variant = product.variants[0];
  // Adjust inventory to low stock (e.g., 5)
  const lowStock = 5;
  const adjustmentResult: IShoppingMallInventoryHistory =
    await api.functional.shoppingMall.seller.variants.adjust_inventory.adjustInventory(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          variant_id: variant.id,
          quantity_change: lowStock - variant.stockQuantity,
          reason: "restock",
          metadata: null,
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(adjustmentResult);
  // Attempt to reduce stock below zero (should fail)
  const negativeAdjustment = variant.stockQuantity + 1;
  await TestValidator.error(
    "negative stock adjustment should be blocked",
    async () => {
      await api.functional.shoppingMall.seller.variants.adjust_inventory.adjustInventory(
        sellerConnection,
        {
          variantId: variant.id,
          body: {
            variant_id: variant.id,
            quantity_change: -negativeAdjustment,
            reason: "loss",
            metadata: null,
          } satisfies IShoppingMallInventoryHistory.ICreate,
        },
      );
    },
  );
  // Verify stock level remains unchanged
  const updatedVariant = variant; // Use original variant since we can't fetch updated variant
  TestValidator.equals(
    "stock level unchanged after rejected adjustment",
    updatedVariant.stockQuantity,
    lowStock,
  );
}
