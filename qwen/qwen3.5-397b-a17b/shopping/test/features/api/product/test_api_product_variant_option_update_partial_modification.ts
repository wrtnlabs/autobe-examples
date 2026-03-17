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

export async function test_api_product_variant_option_update_partial_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product owned by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with multiple options (color=Red, size=Large, material=Cotton)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
            { key: "material", value: "Cotton" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Verify initial options
  TestValidator.equals("initial option count", variant.options.length, 3);
  const initialColorOption = variant.options.find((o) => o.key === "color");
  TestValidator.predicate(
    "initial color is Red",
    initialColorOption?.value === "Red",
  );
  const initialSizeOption = variant.options.find((o) => o.key === "size");
  TestValidator.predicate(
    "initial size is Large",
    initialSizeOption?.value === "Large",
  );
  const initialMaterialOption = variant.options.find(
    (o) => o.key === "material",
  );
  TestValidator.predicate(
    "initial material is Cotton",
    initialMaterialOption?.value === "Cotton",
  );
  // 4. Perform partial update - only update color option from Red to Blue
  const updatedVariant =
    await api.functional.shoppingMall.products.variants.options.updateOptions(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          key: "color",
          value: "Blue",
        } satisfies IShoppingMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Verify partial update results
  // Color should be changed to Blue
  const updatedColorOption = updatedVariant.options.find(
    (o) => o.key === "color",
  );
  TestValidator.predicate(
    "color updated to Blue",
    updatedColorOption?.value === "Blue",
  );
  // Size should remain unchanged (Large)
  const updatedSizeOption = updatedVariant.options.find(
    (o) => o.key === "size",
  );
  TestValidator.predicate(
    "size remains Large",
    updatedSizeOption?.value === "Large",
  );
  // Material should remain unchanged (Cotton)
  const updatedMaterialOption = updatedVariant.options.find(
    (o) => o.key === "material",
  );
  TestValidator.predicate(
    "material remains Cotton",
    updatedMaterialOption?.value === "Cotton",
  );
  // Option count should remain the same
  TestValidator.equals(
    "option count unchanged",
    updatedVariant.options.length,
    3,
  );
  // Verify variant ID and product association unchanged
  TestValidator.equals("variant ID unchanged", updatedVariant.id, variant.id);
  TestValidator.equals(
    "product ID unchanged",
    updatedVariant.product.id,
    product.id,
  );
  // Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(updatedVariant.updatedAt) > new Date(variant.updatedAt),
  );
}
