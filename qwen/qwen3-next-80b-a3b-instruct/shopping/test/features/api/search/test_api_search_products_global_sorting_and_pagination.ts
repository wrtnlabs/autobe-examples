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
export async function test_api_search_products_global_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer for search access
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Test with sort: newest (default)
  const searchResultsNewest =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          // Using default sort: newest, page: 1, limit: 10
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsNewest);
  // Removed validation of sort on pagination - this property doesn't exist in IPagination type
  TestValidator.equals(
    "page is 1 by default",
    searchResultsNewest.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 10 by default",
    searchResultsNewest.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count >= 0",
    searchResultsNewest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count >= 0",
    searchResultsNewest.pagination.pages >= 0,
  );
  // Step 3: Test with sort: price_asc
  const searchResultsPriceAsc =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          sort: "price_asc",
          page: 2,
          limit: 25,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsPriceAsc);
  // Removed validation of sort on pagination - this property doesn't exist in IPagination type
  TestValidator.equals(
    "page should be 2",
    searchResultsPriceAsc.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should be 25",
    searchResultsPriceAsc.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "records count >= 0",
    searchResultsPriceAsc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count >= 0",
    searchResultsPriceAsc.pagination.pages >= 0,
  );
  // Step 4: Test with sort: price_desc
  const searchResultsPriceDesc =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          sort: "price_desc",
          page: 3,
          limit: 50,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsPriceDesc);
  // Removed validation of sort on pagination - this property doesn't exist in IPagination type
  TestValidator.equals(
    "page should be 3",
    searchResultsPriceDesc.pagination.current,
    3,
  );
  TestValidator.equals(
    "limit should be 50",
    searchResultsPriceDesc.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "records count >= 0",
    searchResultsPriceDesc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count >= 0",
    searchResultsPriceDesc.pagination.pages >= 0,
  );
  // Step 5: Test max limit (50) edge case
  const searchResultsMaxLimit =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          sort: "newest",
          limit: 50,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsMaxLimit);
  TestValidator.equals(
    "limit should be capped at 50",
    searchResultsMaxLimit.pagination.limit,
    50,
  );
  // Step 6: Test min limit (1) edge case
  const searchResultsMinLimit =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          sort: "newest",
          limit: 1,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsMinLimit);
  TestValidator.equals(
    "limit should be respected as 1",
    searchResultsMinLimit.pagination.limit,
    1,
  );
  // Step 7: Test page with min value 1
  const searchResultsMinPage =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsMinPage);
  TestValidator.equals(
    "page should be min value 1",
    searchResultsMinPage.pagination.current,
    1,
  );
  // Step 8: Test default page value when not specified
  const searchResultsNoPage =
    await api.functional.shoppingMall.search.products.global.search(
      customerConnection,
      {
        body: {
          sort: "newest",
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResultsNoPage);
  TestValidator.equals(
    "page should default to 1 when not specified",
    searchResultsNoPage.pagination.current,
    1,
  );
  // Step 9: Confirm search results contain expected data structure
  searchResultsNewest.data.forEach((product) => {
    typia.assert<IShoppingMallProduct.ISummary>(product);
    TestValidator.predicate(
      "product name is string or null",
      typeof product.name === "string" || product.name === null,
    );
    TestValidator.predicate(
      "product basePrice is number or null",
      (typeof product.basePrice === "number" && product.basePrice >= 0) ||
        product.basePrice === null,
    );
    TestValidator.predicate(
      "product productId is UUID",
      typeof product.productId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          product.productId,
        ),
    );
    TestValidator.predicate(
      "product categoryPath is array",
      Array.isArray(product.categoryPath),
    );
    TestValidator.predicate(
      "product sellerName is string",
      typeof product.sellerName === "string",
    );
    TestValidator.predicate(
      "product isAvailable is boolean",
      typeof product.isAvailable === "boolean",
    );
    TestValidator.predicate(
      "product variantCount is non-negative integer",
      typeof product.variantCount === "number" &&
        Number.isInteger(product.variantCount) &&
        product.variantCount >= 0,
    );
  });
}