import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
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

export async function test_api_product_option_value_listing_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
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
  // 3. Create an option definition (Color)
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
  // 4. Create multiple option values (Red, Blue, Green)
  const optionValueNames = ["Red", "Blue", "Green"] as const;
  const optionValues: IShoppingMallProductOptionValue[] = [];
  for (const name of optionValueNames) {
    const optionValue =
      await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
            optionDefinitionId: optionDefinition.id,
          },
          body: {
            name: name,
          },
        },
      );
    typia.assert(optionValue);
    optionValues.push(optionValue);
  }
  // 5. Retrieve paginated list of option values
  const response =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.equals("total records", response.pagination.records, 3);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // 7. Validate option values are returned
  TestValidator.equals(
    "option values count",
    response.data.length,
    optionValues.length,
  );
  // 8. Validate each option value has correct business logic values
  for (let i = 0; i < response.data.length; i++) {
    const returnedValue = response.data[i];
    const expectedName = optionValueNames[i];
    TestValidator.equals(
      "option value name matches",
      returnedValue.name,
      expectedName,
    );
    TestValidator.equals(
      "option definition ID matches",
      returnedValue.optionDefinition.id,
      optionDefinition.id,
    );
    TestValidator.equals(
      "option definition name matches",
      returnedValue.optionDefinition.name,
      "Color",
    );
    TestValidator.equals(
      "deleted_at is null (active)",
      returnedValue.deleted_at,
      null,
    );
  }
}
