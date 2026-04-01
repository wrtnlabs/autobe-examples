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
 * Test that a seller can successfully retrieve a specific product option value from their own product.
 *
 * Test Steps:
 * 1. Register a new seller account
 * 2. Create a product under the seller account with required fields (name, description, category_id, base_price)
 * 3. Create an option definition (e.g., 'Color') under the product
 * 4. Create an option value (e.g., 'Red') under the option definition
 * 5. Retrieve the specific option value using the nested path with all three IDs
 *
 * Validation Points:
 * - Response body contains the complete option value entity with id, name, created_at, updated_at, deleted_at fields
 * - The optionDefinition field is populated with the parent option definition summary (id, name, created_at, product reference)
 * - The returned option value name matches the created value (e.g., 'Red')
 * - The option value's optionDefinition.id matches the optionDefinitionId from the request path
 * - All timestamps are valid ISO 8601 date-time format
 * - The deleted_at field is null (active record)
 *
 * Business Logic Validated:
 * - Sellers can access option values belonging to their own products
 * - Hierarchical relationship is correctly maintained (option value → option definition → product)
 * - Complete option value details including parent reference are returned
 */
export async function test_api_product_option_value_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
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
  // 2. Create a product under the seller account
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
  // 3. Create an option definition under the product
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
  // 4. Create an option value under the option definition
  const optionValueName = "Red";
  const optionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: optionValueName,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // 5. Retrieve the specific option value using the nested path
  const retrievedOptionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.at(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        optionValueId: optionValue.id,
      },
    );
  typia.assert(retrievedOptionValue);
  // Validation: Verify the retrieved option value matches the created one
  TestValidator.equals(
    "option value id",
    retrievedOptionValue.id,
    optionValue.id,
  );
  TestValidator.equals(
    "option value name",
    retrievedOptionValue.name,
    optionValueName,
  );
  TestValidator.equals(
    "option definition id",
    retrievedOptionValue.optionDefinition.id,
    optionDefinition.id,
  );
  TestValidator.equals(
    "option definition name",
    retrievedOptionValue.optionDefinition.name,
    "Color",
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedOptionValue.deleted_at === null,
  );
}