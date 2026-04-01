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

export async function test_api_product_variant_update_option_combinations(
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
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create option definitions (Color and Size)
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
  // 4. Create option values for Color (Red, Blue)
  const redOptionValue =
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
  typia.assert(redOptionValue);
  const blueOptionValue =
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
  typia.assert(blueOptionValue);
  // 5. Create option values for Size (Small, Large)
  const smallOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, optionDefinitionId: sizeOptionDef.id },
        body: { name: "Small" },
      },
    );
  typia.assert(smallOptionValue);
  const largeOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, optionDefinitionId: sizeOptionDef.id },
        body: { name: "Large" },
      },
    );
  typia.assert(largeOptionValue);
  // 6. Create initial variant with Color=Red, Size=Large
  const initialVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-INITIAL-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [redOptionValue.id, largeOptionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  // Validate initial variant has correct option values
  TestValidator.equals(
    "initial variant has 2 option values",
    initialVariant.variantOptions.length,
    2,
  );
  TestValidator.predicate(
    "initial variant has Red option",
    initialVariant.variantOptions.some((opt) => opt.id === redOptionValue.id),
  );
  TestValidator.predicate(
    "initial variant has Large option",
    initialVariant.variantOptions.some((opt) => opt.id === largeOptionValue.id),
  );
  // 7. Update variant to use Color=Blue, Size=Small
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          sku_code: `SKU-UPDATED-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2000>
          >(),
          option_value_ids: [blueOptionValue.id, smallOptionValue.id],
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 8. Validate the update succeeded with new option combinations
  TestValidator.equals(
    "updated variant has 2 option values",
    updatedVariant.variantOptions.length,
    2,
  );
  TestValidator.predicate(
    "updated variant has Blue option",
    updatedVariant.variantOptions.some((opt) => opt.id === blueOptionValue.id),
  );
  TestValidator.predicate(
    "updated variant has Small option",
    updatedVariant.variantOptions.some((opt) => opt.id === smallOptionValue.id),
  );
  TestValidator.notEquals(
    "SKU code changed",
    initialVariant.skuCode,
    updatedVariant.skuCode,
  );
  TestValidator.notEquals(
    "price override changed",
    initialVariant.priceOverride,
    updatedVariant.priceOverride,
  );
  TestValidator.predicate(
    "updated timestamp is newer",
    new Date(updatedVariant.updatedAt).getTime() >
      new Date(initialVariant.updatedAt).getTime(),
  );
}
