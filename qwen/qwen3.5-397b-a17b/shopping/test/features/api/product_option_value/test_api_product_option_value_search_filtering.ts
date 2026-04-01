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

/**
 * Test that a seller can filter option values by name using the search parameter.
 *
 * This test verifies the search filtering functionality for product option values:
 * 1. Seller authentication and setup (product, option definition, option values)
 * 2. Partial match search (e.g., 'ed' matches 'Red')
 * 3. Multiple match search (e.g., 'l' matches 'Blue', 'Yellow', 'Black')
 * 4. Exact match search (e.g., 'Green' matches only 'Green')
 * 5. Non-matching search returns empty results with valid pagination
 * 6. Search works correctly with pagination parameters
 */
export async function test_api_product_option_value_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
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
  // 3. Create an option definition (Color)
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
  // 4. Create multiple option values with distinct names
  const optionValueNames = ["Red", "Blue", "Green", "Yellow", "Black"];
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
          } satisfies IShoppingMallProductOptionValue.ICreate,
        },
      );
    typia.assert(optionValue);
    optionValues.push(optionValue);
  }
  // 5. Test partial match search: 'ed' should match only 'Red'
  const searchEdResult =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          search: "ed",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(searchEdResult);
  TestValidator.equals(
    "search 'ed' returns 1 result",
    searchEdResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'ed' matches Red",
    searchEdResult.data[0]?.name.toLowerCase().includes("ed"),
    true,
  );
  TestValidator.predicate(
    "search 'ed' pagination is valid",
    searchEdResult.pagination.records === 1 &&
      searchEdResult.pagination.current === 1,
  );
  // 6. Test partial match search: 'l' should match 'Blue', 'Yellow', 'Black'
  const searchLResult =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          search: "l",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(searchLResult);
  TestValidator.predicate(
    "search 'l' returns 3 results",
    searchLResult.data.length === 3,
  );
  const searchLNames = searchLResult.data.map((v) => v.name.toLowerCase());
  TestValidator.predicate(
    "search 'l' matches Blue, Yellow, Black",
    searchLNames.includes("blue") &&
      searchLNames.includes("yellow") &&
      searchLNames.includes("black"),
  );
  // 7. Test exact match search: 'Green' should match only 'Green'
  const searchGreenResult =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          search: "Green",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(searchGreenResult);
  TestValidator.equals(
    "search 'Green' returns 1 result",
    searchGreenResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'Green' matches Green",
    searchGreenResult.data[0]?.name,
    "Green",
  );
  // 8. Test non-matching search: 'xyz' should return empty results
  const searchXyzResult =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          search: "xyz",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(searchXyzResult);
  TestValidator.equals(
    "search 'xyz' returns 0 results",
    searchXyzResult.data.length,
    0,
  );
  TestValidator.equals(
    "search 'xyz' pagination records is 0",
    searchXyzResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search 'xyz' pagination pages is 0",
    searchXyzResult.pagination.pages,
    0,
  );
  // 9. Test search with pagination: limit 2, page 1 for 'l' search
  const searchLPagedResult =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          search: "l",
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(searchLPagedResult);
  TestValidator.equals(
    "search 'l' page 1 limit 2 returns 2 results",
    searchLPagedResult.data.length,
    2,
  );
  TestValidator.equals(
    "search 'l' pagination current page is 1",
    searchLPagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search 'l' pagination limit is 2",
    searchLPagedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "search 'l' pagination total records is 3",
    searchLPagedResult.pagination.records === 3,
  );
  TestValidator.equals(
    "search 'l' pagination total pages is 2",
    searchLPagedResult.pagination.pages,
    2,
  );
  // 10. Test search with pagination: limit 2, page 2 for 'l' search
  const searchLPagedResult2 =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          search: "l",
          page: 2,
          limit: 2,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(searchLPagedResult2);
  TestValidator.equals(
    "search 'l' page 2 limit 2 returns 1 result",
    searchLPagedResult2.data.length,
    1,
  );
  TestValidator.equals(
    "search 'l' pagination current page is 2",
    searchLPagedResult2.pagination.current,
    2,
  );
  // 11. Test no search parameter returns all option values
  const allResult =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.index(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductOptionValue.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "no search returns all 5 option values",
    allResult.data.length,
    5,
  );
  TestValidator.equals(
    "no search pagination records is 5",
    allResult.pagination.records,
    5,
  );
}
