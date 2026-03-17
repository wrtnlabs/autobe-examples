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

export async function test_api_product_variant_update_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product owned by the seller (utility handles category ID internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create initial variant for the product
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            {
              key: "color",
              value: "Blue",
            } satisfies IShoppingMallProductVariantOption.ICreate,
            {
              key: "size",
              value: "Medium",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  // 4. Update the variant with new configuration
  const updatedVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          skuCode: `SKU-UPDATED-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2000>
          >(),
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<200>
          >(),
          optionValues: {
            color: "Red",
            size: "Large",
            material: "Cotton",
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the update results
  TestValidator.notEquals(
    "SKU code changed",
    initialVariant.skuCode,
    updatedVariant.skuCode,
  );
  TestValidator.notEquals(
    "Price changed",
    initialVariant.price,
    updatedVariant.price,
  );
  TestValidator.notEquals(
    "Stock quantity changed",
    initialVariant.stockQuantity,
    updatedVariant.stockQuantity,
  );
  TestValidator.predicate(
    "Updated timestamp refreshed",
    new Date(updatedVariant.updatedAt) > new Date(initialVariant.updatedAt),
  );
  TestValidator.equals(
    "Variant ID preserved",
    initialVariant.id,
    updatedVariant.id,
  );
  TestValidator.equals(
    "Product association preserved",
    initialVariant.product.id,
    updatedVariant.product.id,
  );
  // 6. Validate option values were completely replaced
  TestValidator.predicate(
    "Has 3 options (replaced, not merged)",
    () => updatedVariant.options.length === 3,
  );
  const optionMap = new Map(
    updatedVariant.options.map((opt) => [opt.key, opt.value]),
  );
  TestValidator.equals("Color option", optionMap.get("color"), "Red");
  TestValidator.equals("Size option", optionMap.get("size"), "Large");
  TestValidator.equals("Material option", optionMap.get("material"), "Cotton");
  TestValidator.predicate(
    "Old Blue value removed",
    () => !Array.from(optionMap.values()).includes("Blue"),
  );
  TestValidator.predicate(
    "Old Medium value removed",
    () => !Array.from(optionMap.values()).includes("Medium"),
  );
}
