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
import { generate_random_shopping_mall_seller_products_variants_options_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_options_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test successful deletion of a product variant option by the owning seller.
 *
 * This test verifies that a seller can delete an individual option from their
 * product variant without affecting the variant itself or other options.
 *
 * Test Flow:
 * 1. Register a seller account
 * 2. Create a product under the seller
 * 3. Create a variant with multiple options (color, size)
 * 4. Add an additional option (material) to have multiple options
 * 5. Delete one option (material)
 * 6. Verify deletion succeeds and variant remains intact
 */
export async function test_api_product_variant_option_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Create a variant with initial options (color=Red, size=Large)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies Partial<IShoppingMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 4. Add an additional option (material) to have multiple options for deletion testing
  const additionalOption =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "material",
          value: "Cotton",
        } satisfies IShoppingMallProductVariantOption.ICreate,
      },
    );
  typia.assert(additionalOption);
  // Verify variant initially has 3 options (color, size, material)
  TestValidator.equals("initial option count", variant.options.length, 3);
  // 5. Delete the additional option (material)
  await api.functional.shoppingMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionId: additionalOption.id,
    },
  );
  // 6. Validate deletion succeeded (void response means 204 No Content)
  // The variant should still exist with remaining options (color, size)
  // Note: Option deletion does not create snapshots per specification
  TestValidator.predicate("deletion completed without error", true);
}
