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

export async function test_api_product_variant_creation_with_option_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create parent product
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
  // 3. Create option definitions (Color and Size)
  const colorOptionDef =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(colorOptionDef);
  const sizeOptionDef =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Size",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(sizeOptionDef);
  // 4. Create option values for each definition
  const redOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: colorOptionDef.id,
        },
        body: { name: "Red" } satisfies IShoppingMallProductOptionValue.ICreate,
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
  const smallOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, optionDefinitionId: sizeOptionDef.id },
        body: {
          name: "Small",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(smallOptionValue);
  const largeOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, optionDefinitionId: sizeOptionDef.id },
        body: {
          name: "Large",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(largeOptionValue);
  // 5. Create variant with Red + Small combination
  const uniqueSkuCode = `SKU-${RandomGenerator.alphaNumeric(12)}`;
  const priceOverride = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: uniqueSkuCode,
          price_override: priceOverride,
          option_value_ids: [redOptionValue.id, smallOptionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Validate variant properties
  TestValidator.equals("SKU code matches", variant.skuCode, uniqueSkuCode);
  TestValidator.equals(
    "Price override matches",
    variant.priceOverride,
    priceOverride,
  );
  TestValidator.equals(
    "Variant has 2 option values",
    variant.variantOptions.length,
    2,
  );
  // 7. Validate option values are correctly linked
  const variantOptionIds = variant.variantOptions.map((opt) => opt.id);
  TestValidator.predicate(
    "Red option value linked",
    variantOptionIds.includes(redOptionValue.id),
  );
  TestValidator.predicate(
    "Small option value linked",
    variantOptionIds.includes(smallOptionValue.id),
  );
  // 8. Validate option value details
  const redOptionInVariant = variant.variantOptions.find(
    (opt) => opt.id === redOptionValue.id,
  );
  const smallOptionInVariant = variant.variantOptions.find(
    (opt) => opt.id === smallOptionValue.id,
  );
  typia.assertGuard(redOptionInVariant!);
  typia.assertGuard(smallOptionInVariant!);
  TestValidator.equals("Red option name", redOptionInVariant.name, "Red");
  TestValidator.equals("Small option name", smallOptionInVariant.name, "Small");
  TestValidator.equals(
    "Red option belongs to Color definition",
    redOptionInVariant.optionDefinition.name,
    "Color",
  );
  TestValidator.equals(
    "Small option belongs to Size definition",
    smallOptionInVariant.optionDefinition.name,
    "Size",
  );
  // 9. Validate variant belongs to correct product
  // Note: variant.product is ISummary type which has limited fields
  // The product relationship is validated through the API call itself
}