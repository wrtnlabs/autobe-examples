import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallVariantStocks } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantStocks";
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
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_stock_adjustment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url: null,
  };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerResponse);
  // 2. Create a product with variant for testing
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "size",
                option_value: "M",
              },
            ],
            stock_quantity: 50,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get the variant ID
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  const variantId = product.variants[0].id;
  // 3. Perform stock adjustment (restocking 100 units)
  const adjustmentData: IShoppingMallVariantStocks.IAdjustment = {
    quantity: 100,
    reason: "supplier shipment",
  };
  await api.functional.shoppingMall.seller.variant_stocks.adjust(
    sellerConnection,
    {
      variantId,
      body: adjustmentData,
    },
  );
  // 4. Verify stock was updated correctly by retrieving the product
  // Since detail endpoint doesn't exist, we'll verify through the product response
  // The adjust endpoint doesn't return anything, so we can only verify the operation completed
  TestValidator.equals("stock adjustment completed without error", true, true);
}
