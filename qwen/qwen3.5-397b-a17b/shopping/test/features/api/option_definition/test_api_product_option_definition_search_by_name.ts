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
 * Test product option definition search by name functionality.
 *
 * This test validates that sellers can filter product option definitions
 * using the search parameter. It tests:
 * 1. Seller authentication and product creation
 * 2. Multiple option definitions with distinct names
 * 3. Partial match search functionality
 * 4. Case-insensitive search behavior
 * 5. Pagination with filtered results
 */
export async function test_api_product_option_definition_search_by_name(
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
  // 3. Create multiple option definitions with distinct names
  const optionNames = ["Color", "Size", "Material", "Pattern"] as const;
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
  // 4. Search with partial match 'Col' should return only 'Color'
  const searchColorResult =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "Col",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchColorResult);
  // 5. Verify only 'Color' option is returned
  TestValidator.equals(
    "search 'Col' returns 1 result",
    searchColorResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'Col' returns Color option",
    searchColorResult.data[0].name,
    "Color",
  );
  // 6. Test case-insensitive search with lowercase 'size'
  const searchSizeResult =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "size",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchSizeResult);
  TestValidator.equals(
    "search 'size' (lowercase) returns 1 result",
    searchSizeResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'size' returns Size option",
    searchSizeResult.data[0].name,
    "Size",
  );
  // 7. Test partial match 'at' should return 'Material' and 'Pattern'
  const searchAtResult =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "at",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchAtResult);
  TestValidator.predicate(
    "search 'at' returns at least 2 results (Material and Pattern)",
    searchAtResult.data.length >= 2,
  );
  const returnedNames = searchAtResult.data.map((opt) => opt.name);
  TestValidator.predicate(
    "search 'at' includes Material",
    returnedNames.includes("Material"),
  );
  TestValidator.predicate(
    "search 'at' includes Pattern",
    returnedNames.includes("Pattern"),
  );
  // 8. Test pagination with filtered results
  const searchEmptyResult =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "NonExistentOption",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchEmptyResult);
  TestValidator.equals(
    "search non-existent returns 0 results",
    searchEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty search",
    searchEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for empty search",
    searchEmptyResult.pagination.pages,
    0,
  );
  // 9. Test without search parameter returns all options
  const allOptionsResult =
    await api.functional.shoppingMall.seller.products.option_definitions.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allOptionsResult);
  TestValidator.equals(
    "no search returns all 4 options",
    allOptionsResult.data.length,
    4,
  );
  TestValidator.equals(
    "pagination records matches data length",
    allOptionsResult.pagination.records,
    4,
  );
}
