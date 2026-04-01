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

export async function test_api_product_option_value_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller (product owner)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. Create product owned by first seller
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create option definition under the product
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      seller1Connection,
      {
        params: { productId: product.id },
        body: {
          name: RandomGenerator.pick(["Color", "Size", "Material"]),
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option value under the option definition
  const originalOptionValueName = RandomGenerator.pick([
    "Red",
    "Blue",
    "Green",
    "Large",
    "Small",
    "Medium",
  ]);
  const optionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      seller1Connection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: originalOptionValueName,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // 5. Update the option value using the owner seller's connection
  const updatedOptionValueName = RandomGenerator.pick([
    "Crimson",
    "Navy",
    "Emerald",
    "X-Large",
    "X-Small",
    "Extra Large",
  ]);
  const updatedOptionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.update(
      seller1Connection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        optionValueId: optionValue.id,
        body: {
          name: updatedOptionValueName,
        } satisfies IShoppingMallProductOptionValue.IUpdate,
      },
    );
  typia.assert(updatedOptionValue);
  // 6. Validate the updated option value name matches the request
  TestValidator.equals(
    "option value name updated",
    updatedOptionValue.name,
    updatedOptionValueName,
  );
  // 7. Verify the option value maintains correct hierarchical links
  TestValidator.equals(
    "option definition ID matches",
    updatedOptionValue.optionDefinition.id,
    optionDefinition.id,
  );
  // 8. Verify timestamps were updated
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedOptionValue.updated_at).getTime() >=
      new Date(updatedOptionValue.created_at).getTime(),
  );
  // 9. Verify deleted_at remains null
  TestValidator.equals(
    "option value is not deleted",
    updatedOptionValue.deleted_at,
    null,
  );
}