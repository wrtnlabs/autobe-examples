import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_search_products_global_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Validate search functionality with various criteria
  const searchKeywords = ["laptop", "smartphone", "headphones", "book"];
  // For each search term, validate that products match the keyword
  for (const keyword of searchKeywords) {
    const searchResult: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.search.products.global.search(
        customerConnection,
        {
          body: {
            search: keyword,
          } satisfies IShoppingMallProduct.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination information
    TestValidator.equals(
      "page should be 1",
      searchResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit should be 10",
      searchResult.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "records should be >= 0",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages should be >= 0",
      searchResult.pagination.pages >= 0,
    );
    // Validate each product in result contains the search keyword in name
    for (const product of searchResult.data) {
      TestValidator.predicate(
        `product name should contain '${keyword}'`,
        product.name !== null &&
          product.name.toLowerCase().includes(keyword.toLowerCase()),
      );
    }
  }
  // Step 3: Validate search with empty string returns all products
  const emptySearchResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          search: "",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate that search with empty string returns at least some products
  TestValidator.predicate(
    "empty search should return products",
    emptySearchResult.data.length > 0,
  );
  // Step 4: Validate search returns 0 products for a non-existent keyword
  const nonExistentKeyword = "abcdefgxyz";
  const emptyResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          search: nonExistentKeyword,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate that non-existent keyword returns 0 results
  TestValidator.equals(
    `no products should match '${nonExistentKeyword}'`,
    emptyResult.data.length,
    0,
  );
  // Step 5: Validate search with pagination
  const limitedResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          search: "laptop",
          limit: 5,
          page: 1,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(limitedResult);
  // Validate pagination limit
  TestValidator.equals("limit should be 5", limitedResult.pagination.limit, 5);
  TestValidator.equals("page should be 1", limitedResult.pagination.current, 1);
  TestValidator.predicate(
    "results should be <= 5",
    limitedResult.data.length <= 5,
  );
  // Validate second page of results
  const secondPageResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          search: "laptop",
          limit: 5,
          page: 2,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(secondPageResult);
  // Validate that page 2 has different results than page 1
  // Verify pages are not identical
  TestValidator.notEquals(
    "page 1 and page 2 should have different products",
    limitedResult.data.map((p) => p.productId),
    secondPageResult.data.map((p) => p.productId),
  );
  // Step 6: Validate search result structure
  // Check that each product has the required structure
  const testResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          search: "laptop",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(testResult);
  for (const product of testResult.data) {
    // Product must have productId (formatted as uuid)
    TestValidator.predicate(
      "productId is valid uuid",
      typia.is<string & tags.Format<"uuid">>(product.productId),
    );
    // Product name can be null, but if present, should be string
    TestValidator.predicate(
      "name is either string or null",
      product.name === null || typeof product.name === "string",
    );
    // Base price should be non-negative number or null
    TestValidator.predicate(
      "basePrice is non-negative number or null",
      product.basePrice === null ||
        (typeof product.basePrice === "number" && product.basePrice >= 0),
    );
    // categoryPath should be array of strings
    TestValidator.predicate(
      "categoryPath is array",
      Array.isArray(product.categoryPath),
    );
    TestValidator.predicate(
      "all categoryPath elements are strings",
      product.categoryPath.every((p) => typeof p === "string"),
    );
    // Seller name must be string
    TestValidator.predicate(
      "sellerName is string",
      typeof product.sellerName === "string",
    );
    // isAvailable must be boolean
    TestValidator.predicate(
      "isAvailable is boolean",
      typeof product.isAvailable === "boolean",
    );
    // variantCount must be non-negative integer
    TestValidator.predicate(
      "variantCount is non-negative integer",
      typeof product.variantCount === "number" &&
        Number.isInteger(product.variantCount) &&
        product.variantCount >= 0,
    );
  }
}
