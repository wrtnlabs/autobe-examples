import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test variant creation with multiple option key-value pairs to validate the composition relationship.
 *
 * This test verifies that:
 * 1. Seller can create a variant with multiple options (color, size, material)
 * 2. All option records are created as child records in the variant options table
 * 3. Each option has a unique key within the variant
 * 4. The complete variant response includes all option key-value pairs
 * 5. Options are properly normalized and stored
 */
export async function test_api_product_variant_multiple_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product for variant testing
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant with multiple options (color, size, material)
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variantOptions: IShoppingMallProductVariantOption.ICreate[] = [
    { key: "color", value: "Red" },
    { key: "size", value: "Large" },
    { key: "material", value: "Cotton" },
  ];
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: skuCode,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          options: variantOptions,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Validate all options are created (should have 3 options)
  TestValidator.equals(
    "variant has correct number of options",
    variant.options.length,
    3,
  );
  // 5. Validate each option key-value pair exists
  const optionMap = new Map(variant.options.map((opt) => [opt.key, opt.value]));
  TestValidator.equals("color option", optionMap.get("color"), "Red");
  TestValidator.equals("size option", optionMap.get("size"), "Large");
  TestValidator.equals("material option", optionMap.get("material"), "Cotton");
  // 6. Validate variant is linked to correct product
  TestValidator.equals(
    "variant product matches",
    variant.product.id,
    product.id,
  );
  // 7. Validate SKU code matches input
  TestValidator.equals("SKU code matches input", variant.skuCode, skuCode);
  // 8. Validate all option keys are unique within the variant
  const optionKeys = variant.options.map((opt) => opt.key);
  const uniqueKeys = new Set(optionKeys);
  TestValidator.equals(
    "all option keys are unique",
    uniqueKeys.size,
    optionKeys.length,
  );
}
