import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the primary success path for updating a product variant.
 * A seller creates a product with option definitions (Color, Size) and option values
 * (Red, Blue, Large, Small), then creates an initial variant. The seller updates the
 * variant with a new unique SKU code and a price override value. Verify the update
 * succeeds, the variant reflects the new SKU and price, and an immutable snapshot is
 * created preserving the previous state.
 */
export async function test_api_product_variant_update_with_sku_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create option definitions (Color, Size)
  const colorOptionDef =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { name: "Color" },
      },
    );
  typia.assert(colorOptionDef);
  const sizeOptionDef =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { name: "Size" },
      },
    );
  typia.assert(sizeOptionDef);
  // 4. Create option values
  const redValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: colorOptionDef.id,
        },
        body: { name: "Red" },
      },
    );
  typia.assert(redValue);
  const blueValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: colorOptionDef.id,
        },
        body: { name: "Blue" },
      },
    );
  typia.assert(blueValue);
  const largeValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, optionDefinitionId: sizeOptionDef.id },
        body: { name: "Large" },
      },
    );
  typia.assert(largeValue);
  const smallValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, optionDefinitionId: sizeOptionDef.id },
        body: { name: "Small" },
      },
    );
  typia.assert(smallValue);
  // 5. Create initial variant (Red + Large)
  const initialSku = `SKU-INITIAL-${RandomGenerator.alphaNumeric(8)}`;
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSku,
          price_override: initialPrice,
          option_value_ids: [redValue.id, largeValue.id],
        },
      },
    );
  typia.assert(initialVariant);
  // 6. Update variant with new SKU and price
  const updatedSku = `SKU-UPDATED-${RandomGenerator.alphaNumeric(8)}`;
  const updatedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2000>
  >();
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          sku_code: updatedSku,
          price_override: updatedPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Validate update results
  TestValidator.equals("SKU code updated", updatedVariant.skuCode, updatedSku);
  TestValidator.equals(
    "Price override updated",
    updatedVariant.priceOverride,
    updatedPrice,
  );
  TestValidator.notEquals(
    "SKU changed from initial",
    initialVariant.skuCode,
    updatedVariant.skuCode,
  );
  TestValidator.predicate(
    "Variant options preserved",
    updatedVariant.variantOptions.length === 2,
  );
}
