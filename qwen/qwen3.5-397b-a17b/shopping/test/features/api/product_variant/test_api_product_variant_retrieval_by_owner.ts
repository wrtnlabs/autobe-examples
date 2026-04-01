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
 * Test that a seller can successfully retrieve detailed information about a specific product variant they own.
 *
 * This test validates the complete workflow:
 * 1. Register and authenticate as a seller
 * 2. Create a product with option definitions (Color, Size)
 * 3. Create option values (Red, Blue for Color; Large, Small for Size)
 * 4. Create a variant with specific option combinations (Color=Red, Size=Large)
 * 5. Retrieve the variant using GET /shoppingMall/seller/products/{productId}/variants/{variantId}
 * 6. Verify response contains complete variant details including SKU code, price override,
 *    parent product reference, and all variant options with their definitions
 * 7. Confirm timestamps are present and deletedAt is null for active variants
 */
export async function test_api_product_variant_retrieval_by_owner(
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
  // 3. Create option definition for Color
  const colorOptionDef =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(colorOptionDef);
  // 4. Create option definition for Size
  const sizeOptionDef =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          name: "Size",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(sizeOptionDef);
  // 5. Create option values for Color (Red, Blue)
  const redOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: colorOptionDef.id,
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
          optionDefinitionId: colorOptionDef.id,
        },
        body: {
          name: "Blue",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(blueOptionValue);
  // 6. Create option values for Size (Large, Small)
  const largeOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: sizeOptionDef.id,
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
          optionDefinitionId: sizeOptionDef.id,
        },
        body: {
          name: "Small",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(smallOptionValue);
  // 7. Create a variant with Color=Red, Size=Large
  const priceOverride = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: priceOverride,
          option_value_ids: [redOptionValue.id, largeOptionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Retrieve the variant using GET endpoint
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 9. Validate variant details
  TestValidator.equals("variant ID matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedVariant.skuCode,
    variant.skuCode,
  );
  TestValidator.equals(
    "price override matches",
    retrievedVariant.priceOverride,
    priceOverride,
  );
  TestValidator.equals(
    "product ID matches",
    typia.assert<IShoppingMallProduct>(retrievedVariant.product).id,
    product.id,
  );
  TestValidator.equals(
    "variant has 2 options",
    retrievedVariant.variantOptions.length,
    2,
  );
  // 10. Validate variant options contain correct option values
  const optionNames = retrievedVariant.variantOptions.map((opt) => opt.name);
  TestValidator.predicate("contains Red option", optionNames.includes("Red"));
  TestValidator.predicate(
    "contains Large option",
    optionNames.includes("Large"),
  );
  // 11. Validate option definitions are correct
  const optionDefNames = retrievedVariant.variantOptions.map(
    (opt) => opt.optionDefinition.name,
  );
  TestValidator.predicate(
    "has Color definition",
    optionDefNames.includes("Color"),
  );
  TestValidator.predicate(
    "has Size definition",
    optionDefNames.includes("Size"),
  );
  // 12. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(Date.parse(retrievedVariant.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(Date.parse(retrievedVariant.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", retrievedVariant.deletedAt, null);
}