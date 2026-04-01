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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";

/**
 * Test complete option value setup workflow where a seller adds multiple option values
 * to support product variant combinations. Creates multiple option values (e.g., 'Red',
 * 'Blue', 'Green') under a single option definition (e.g., 'Color') to enable customers
 * to select from available options when purchasing. Verifies each option value is created
 * successfully with unique IDs, all values are properly linked to the same parent option
 * definition, and the complete set of option values can be retrieved for variant configuration.
 */
export async function test_api_product_option_value_multiple_values_setup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
    {},
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
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  TestValidator.equals(
    "option definition name",
    optionDefinition.name,
    "Color",
  );
  // 4. Create multiple option values under the same option definition
  const optionValueNames = ["Red", "Blue", "Green"] as const;
  const optionValues: IShoppingMallProductOptionValue[] = [];
  for (const valueName of optionValueNames) {
    const optionValue =
      await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
            optionDefinitionId: optionDefinition.id,
          },
          body: {
            name: valueName,
          } satisfies IShoppingMallProductOptionValue.ICreate,
        },
      );
    typia.assert(optionValue);
    optionValues.push(optionValue);
  }
  // 5. Verify each option value has unique ID
  const optionValueIds = optionValues.map((ov) => ov.id);
  TestValidator.equals(
    "unique option value count",
    new Set(optionValueIds).size,
    optionValueNames.length,
  );
  // 6. Verify all option values are linked to the same parent option definition
  for (const optionValue of optionValues) {
    TestValidator.equals(
      `option value ${optionValue.name} parent definition ID`,
      optionValue.optionDefinition.id,
      optionDefinition.id,
    );
    TestValidator.equals(
      `option value ${optionValue.name} matches expected`,
      optionValue.name,
      optionValueNames[optionValues.indexOf(optionValue)],
    );
  }
  // 7. Verify option values have valid timestamps
  for (const optionValue of optionValues) {
    TestValidator.predicate(
      `${optionValue.name} has valid created_at`,
      new Date(optionValue.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      `${optionValue.name} has valid updated_at`,
      new Date(optionValue.updated_at).getTime() > 0,
    );
    TestValidator.equals(
      `${optionValue.name} is not deleted`,
      optionValue.deleted_at,
      null,
    );
  }
}
