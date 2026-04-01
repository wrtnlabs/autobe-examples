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

export async function test_api_product_option_definition_multiple_types_creation(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple option definitions with different names
  const optionNames = ["Color", "Size", "Material"] as const;
  const optionDefinitions: IShoppingMallProductOptionDefinition[] = [];
  for (const optionName of optionNames) {
    const optionDef =
      await generate_random_shopping_mall_seller_products_option_definitions_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            name: optionName,
          } satisfies IShoppingMallProductOptionDefinition.ICreate,
        },
      );
    typia.assert(optionDef);
    optionDefinitions.push(optionDef);
  }
  // 4. Validate each option definition
  TestValidator.equals(
    "option definitions count",
    optionDefinitions.length,
    optionNames.length,
  );
  for (let i = 0; i < optionDefinitions.length; i++) {
    const optionDef = optionDefinitions[i];
    const expectedName = optionNames[i];
    // Validate name matches expected
    TestValidator.equals(
      `${expectedName} option name`,
      optionDef.name,
      expectedName,
    );
    // Validate linked to correct product
    TestValidator.equals(
      `${expectedName} product ID`,
      optionDef.shopping_mall_product_id,
      product.id,
    );
    // Validate not deleted
    TestValidator.equals(
      `${expectedName} not deleted`,
      optionDef.deleted_at,
      null,
    );
  }
  // 5. Validate all option definitions have unique IDs
  const optionIds = optionDefinitions.map((od) => od.id);
  const uniqueIds = new Set(optionIds);
  TestValidator.equals(
    "all option definitions have unique IDs",
    uniqueIds.size,
    optionIds.length,
  );
  // 6. Validate option definitions are distinguishable by name
  const optionNamesCreated = optionDefinitions.map((od) => od.name);
  const uniqueNames = new Set(optionNamesCreated);
  TestValidator.equals(
    "all option definitions have unique names",
    uniqueNames.size,
    optionNamesCreated.length,
  );
  // Verify each expected name exists
  for (const expectedName of optionNames) {
    TestValidator.predicate(
      `${expectedName} option definition exists`,
      optionNamesCreated.includes(expectedName),
    );
  }
}