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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";

/**
 * Test updating a product option definition name.
 *
 * This test validates that a seller can successfully update the name of an
 * option definition (e.g., changing 'Color' to 'Colour') while preserving
 * the option definition's identity and all associated option values.
 *
 * Workflow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Seller creates an option definition with initial name
 * 4. Seller updates the option definition name
 * 5. Verify the name changed, id preserved, and timestamps updated correctly
 */
export async function test_api_product_option_definition_update_name(
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
  // 3. Create an option definition with initial name
  const initialOptionName = "Color";
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: initialOptionName,
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // 4. Update the option definition name
  const updatedOptionName = "Colour";
  const updatedOptionDefinition =
    await api.functional.shoppingMall.seller.products.option_definitions.update(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          name: updatedOptionName,
        } satisfies IShoppingMallProductOptionDefinition.IUpdate,
      },
    );
  typia.assert(updatedOptionDefinition);
  // 5. Validate the update
  TestValidator.equals(
    "option definition id preserved",
    updatedOptionDefinition.id,
    optionDefinition.id,
  );
  TestValidator.equals(
    "option definition name updated",
    updatedOptionDefinition.name,
    updatedOptionName,
  );
  TestValidator.notEquals(
    "option definition name changed",
    optionDefinition.name,
    updatedOptionDefinition.name,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedOptionDefinition.updated_at).getTime() >
      new Date(updatedOptionDefinition.created_at).getTime(),
  );
  TestValidator.equals(
    "product id preserved",
    updatedOptionDefinition.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedOptionDefinition.deleted_at === null,
  );
}
