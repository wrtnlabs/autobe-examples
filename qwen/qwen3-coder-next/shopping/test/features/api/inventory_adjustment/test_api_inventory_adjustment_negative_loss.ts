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

export async function test_api_inventory_adjustment_negative_loss(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(joinResult);
  sellerConnection.headers = { Authorization: joinResult.token.access };
  // 2. Create product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 15,
        }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.MultipleOf<100>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(12),
            option_values: [
              {
                option_name: "color",
                option_value: "white",
              } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            ],
            stock_quantity: 100,
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("product created", product.is_deleted, false);
  TestValidator.notEquals("has variants", product.variants.length, 0);
  const variant = product.variants[0];
  const initialStock = variant.stockQuantity;
  // 4. Negative inventory adjustment (stock loss due to breakage)
  const adjustmentQuantity = -5;
  const inventoryHistory =
    await api.functional.shoppingMall.seller.variants.adjust_inventory.adjustInventory(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          variant_id: variant.id,
          quantity_change: adjustmentQuantity,
          reason: "breakage",
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(inventoryHistory);
  // 5. Verify inventory history record
  TestValidator.equals(
    "variant matches",
    inventoryHistory.variant_id,
    variant.id,
  );
  TestValidator.equals("reason is breakage", inventoryHistory.reason, [
    "breakage",
  ] as const);
  // 6. Verify stock quantity was reduced
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: product.name,
        description: product.description,
        shopping_mall_category_id: product.category.id,
        base_price: product.base_price,
        images: product.images.map(
          (img) =>
            ({
              image_url: img.image_url,
              sort_order: img.sort_order,
            }) satisfies IShoppingMallProductImage.ICreate,
        ),
        variants: product.variants.map(
          (v) =>
            ({
              sku_code: v.skuCode,
              option_values: v.optionValues.map(
                (val, idx) =>
                  ({
                    option_name: "color",
                    option_value: val,
                  }) satisfies IShoppingMallProductVariantOptionValue.ICreate,
              ),
              stock_quantity: v.stockQuantity,
            }) satisfies IShoppingMallProductVariant.ICreate,
        ),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(updatedProduct);
  TestValidator.equals(
    "stock reduced correctly",
    updatedProduct.variants[0].stockQuantity,
    initialStock + adjustmentQuantity,
  );
}
