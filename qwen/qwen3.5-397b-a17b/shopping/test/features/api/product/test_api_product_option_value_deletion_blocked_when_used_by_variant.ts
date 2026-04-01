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

export async function test_api_product_option_value_deletion_blocked_when_used_by_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
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
      },
    },
  );
  typia.assert(product);
  // 3. Create an option definition (e.g., 'Color')
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Color",
        },
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option values (e.g., 'Red', 'Blue')
  const redOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Red",
        },
      },
    );
  typia.assert(redOptionValue);
  const blueOptionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Blue",
        },
      },
    );
  typia.assert(blueOptionValue);
  // 5. Create a product variant that uses the 'Red' option value
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price_override: null,
          option_value_ids: [redOptionValue.id],
        },
      },
    );
  typia.assert(variant);
  // 6. Attempt to delete the 'Red' option value that is used by the variant
  // This should fail with 409 Conflict error
  await TestValidator.error("option value in use by variant", async () => {
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.erase(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        optionValueId: redOptionValue.id,
      },
    );
  });
  // 7. Verify the 'Blue' option value (not in use) can be deleted successfully
  // This confirms the error was specifically due to the variant reference
  await api.functional.shoppingMall.seller.products.option_definitions.option_values.erase(
    sellerConnection,
    {
      productId: product.id,
      optionDefinitionId: optionDefinition.id,
      optionValueId: blueOptionValue.id,
    },
  );
}
