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
 * Test product variant retrieval with multiple option combinations.
 *
 * This test validates that a seller can:
 * 1. Register and authenticate as a seller
 * 2. Create a product with base price
 * 3. Create two option definitions (Color and Size)
 * 4. Create option values for each definition (Red/Blue for Color, Large/Small for Size)
 * 5. Create a variant combining specific values from both option definitions
 * 6. Retrieve the variant and verify variantOptions contains all selected option values
 * 7. Confirm each option value includes complete optionDefinition reference
 * 8. Verify SKU code uniquely identifies this specific combination
 * 9. Validate price override is correctly returned
 */
export async function test_api_product_variant_with_multiple_option_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
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
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first option definition (Color)
  const colorOptionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(colorOptionDefinition);
  // 4. Create option values for Color (Red, Blue)
  const redOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: colorOptionDefinition.id,
        },
        body: {
          name: "Red",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(redOptionValue);
  const blueOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: colorOptionDefinition.id,
        },
        body: {
          name: "Blue",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(blueOptionValue);
  // 5. Create second option definition (Size)
  const sizeOptionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Size",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(sizeOptionDefinition);
  // 6. Create option values for Size (Large, Small)
  const largeOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: sizeOptionDefinition.id,
        },
        body: {
          name: "Large",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(largeOptionValue);
  const smallOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: sizeOptionDefinition.id,
        },
        body: {
          name: "Small",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(smallOptionValue);
  // 7. Create a variant with multiple option combinations (Color=Red, Size=Large)
  const priceOverride = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-RED-LARGE-${RandomGenerator.alphaNumeric(8)}`,
          price_override: priceOverride,
          option_value_ids: [redOptionValue.id, largeOptionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Retrieve the variant
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 9. Validate variant has exactly 2 option values (Color=Red, Size=Large)
  TestValidator.equals(
    "variant has 2 option values",
    retrievedVariant.variantOptions.length,
    2,
  );
  // 10. Verify each option value includes complete optionDefinition reference
  const colorOption = retrievedVariant.variantOptions.find(
    (opt) => opt.optionDefinition.name === "Color",
  );
  const sizeOption = retrievedVariant.variantOptions.find(
    (opt) => opt.optionDefinition.name === "Size",
  );
  TestValidator.predicate("Color option exists", colorOption !== undefined);
  TestValidator.predicate("Size option exists", sizeOption !== undefined);
  // 11. Verify option values are correct (Red and Large)
  TestValidator.equals("Color option value is Red", colorOption!.name, "Red");
  TestValidator.equals("Size option value is Large", sizeOption!.name, "Large");
  // 12. Verify optionDefinition references are complete
  TestValidator.equals(
    "Color optionDefinition name",
    colorOption!.optionDefinition.name,
    "Color",
  );
  TestValidator.equals(
    "Size optionDefinition name",
    sizeOption!.optionDefinition.name,
    "Size",
  );
  // 13. Verify SKU code matches
  TestValidator.equals(
    "SKU code matches",
    retrievedVariant.skuCode,
    variant.skuCode,
  );
  // 14. Verify price override is correctly returned
  TestValidator.equals(
    "Price override matches",
    retrievedVariant.priceOverride,
    priceOverride,
  );
  // 15. Verify product reference is correct
  TestValidator.predicate(
    "Product reference exists",
    retrievedVariant.product !== undefined,
  );
}