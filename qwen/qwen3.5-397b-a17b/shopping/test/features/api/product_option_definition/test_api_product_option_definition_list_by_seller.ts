import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionDefinition";
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
 * Test that a seller can retrieve a paginated list of product option definitions for their product.
 *
 * This test validates:
 * 1. Seller authentication and product creation
 * 2. Multiple option definitions can be created for a product
 * 3. The index endpoint returns all option definitions with correct pagination
 * 4. Search filtering by option name works correctly
 * 5. Product reference in each option definition is correct
 */
export async function test_api_product_option_definition_list_by_seller(
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
  // 3. Create multiple option definitions for the product
  const optionNames = ["Color", "Size", "Material"] as const;
  const createdOptions: IShoppingMallProductOptionDefinition[] = [];
  for (const optionName of optionNames) {
    const optionDef =
      await generate_random_shopping_mall_seller_products_option_definitions_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: { name: optionName },
        },
      );
    typia.assert(optionDef);
    createdOptions.push(optionDef);
  }
  // 4. Retrieve all option definitions with pagination
  const listResponse =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductOptionDefinition.IRequest,
      },
    );
  typia.assert(listResponse);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", listResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records should match created options",
    listResponse.pagination.records,
    createdOptions.length,
  );
  TestValidator.equals(
    "total pages should be 1",
    listResponse.pagination.pages,
    1,
  );
  // 6. Verify all created option definitions are returned
  TestValidator.equals(
    "data array length should match created options",
    listResponse.data.length,
    createdOptions.length,
  );
  // 7. Verify each option definition structure
  for (const optionSummary of listResponse.data) {
    typia.assert(optionSummary);
  }
  // 8. Verify all created option names are present in results
  const returnedOptionNames = listResponse.data.map((opt) => opt.name);
  for (const expectedName of optionNames) {
    TestValidator.predicate(
      `option "${expectedName}" should be in results`,
      returnedOptionNames.includes(expectedName),
    );
  }
  // 9. Test search filtering by option name
  const searchResponse =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "Color",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductOptionDefinition.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Verify search returns only matching option
  TestValidator.equals(
    "search should return 1 result",
    searchResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "search result should be Color",
    searchResponse.data[0].name,
    "Color",
  );
  // 10. Test pagination with smaller limit
  const paginatedResponse =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductOptionDefinition.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated limit should be 2",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated data length should be 2",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.predicate(
    "total pages should be at least 2 with limit 2",
    paginatedResponse.pagination.pages >= 2,
  );
}