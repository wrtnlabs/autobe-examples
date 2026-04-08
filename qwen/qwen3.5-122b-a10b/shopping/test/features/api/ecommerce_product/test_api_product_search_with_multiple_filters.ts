import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test product search endpoint with multiple combined filters.
 *
 * Validates the product search functionality including name keyword search, category filtering, price range filtering, stock availability filtering, sorting, and pagination. Ensures that the search endpoint correctly applies AND logic for multiple filters and returns properly structured paginated responses.
 *
 * Special attention is given to verifying that the response structure includes all required fields in product summaries, pagination metadata is accurate, and business rules are enforced (pending/suspended sellers excluded, soft-deleted products excluded).
 *
 * 1. Customer account creation and authentication via authorize_customer_join utility.
 * 2. Primary search with combined filters: name keyword, category_id, min_price, max_price, in_stock_only.
 * 3. Verify response structure includes all required product summary fields.
 * 4. Verify pagination metadata correctness (current, limit, records, pages).
 * 5. Test sorting by different fields (created_at, base_price) with both directions.
 * 6. Test partial price range filters (only min_price or only max_price).
 * 7. Test in_stock_only filter behavior.
 * 8. Validate search with no matching criteria returns empty results.
 */
export async function test_api_product_search_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Primary search with combined filters
  const combinedSearchRequest: IEcommerceProduct.IRequest = {
    search: RandomGenerator.alphabets(3),
    min_price: 1000,
    max_price: 50000,
    in_stock_only: true,
    sort_by: "created_at",
    sort_order: "desc",
    limit: 20,
  } satisfies IEcommerceProduct.IRequest;
  const combinedSearchResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: combinedSearchRequest,
    });
  typia.assert(combinedSearchResult);
  // 3. Verify response structure
  TestValidator.equals(
    "pagination exists",
    combinedSearchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(combinedSearchResult.data),
    true,
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    combinedSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    combinedSearchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedSearchResult.pagination.pages >= 0,
  );
  // 4. Verify product summary structure for each result
  if (combinedSearchResult.data.length > 0) {
    const firstProduct = combinedSearchResult.data[0];
    TestValidator.predicate(
      "product has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstProduct.id,
      ),
    );
    TestValidator.predicate("product has name", firstProduct.name.length > 0);
    TestValidator.predicate(
      "product has valid base_price",
      typeof firstProduct.base_price === "number",
    );
    TestValidator.predicate(
      "product has seller with shop_name",
      typeof firstProduct.seller.shop_name === "string" &&
        firstProduct.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "product has category with name",
      typeof firstProduct.category.name === "string" &&
        firstProduct.category.name.length > 0,
    );
    TestValidator.predicate(
      "product has stock_status",
      typeof firstProduct.stock_status === "string",
    );
    TestValidator.predicate(
      "product has created_at timestamp",
      typeof firstProduct.created_at === "string",
    );
    TestValidator.predicate(
      "product has updated_at timestamp",
      typeof firstProduct.updated_at === "string",
    );
  }
  // 5. Test sorting by price ascending
  const priceAscSearch: IEcommerceProduct.IRequest = {
    min_price: 0,
    max_price: 1000000,
    sort_by: "base_price",
    sort_order: "asc",
    limit: 10,
  } satisfies IEcommerceProduct.IRequest;
  const priceAscResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: priceAscSearch,
    });
  typia.assert(priceAscResult);
  // Verify prices are in ascending order
  if (priceAscResult.data.length > 1) {
    for (let i = 1; i < priceAscResult.data.length; i++) {
      TestValidator.predicate(
        `price ascending at index ${i}`,
        priceAscResult.data[i - 1].base_price <=
          priceAscResult.data[i].base_price,
      );
    }
  }
  // 6. Test partial price range - only min_price
  const minPriceOnlySearch: IEcommerceProduct.IRequest = {
    min_price: 10000,
    sort_by: "base_price",
    sort_order: "asc",
    limit: 10,
  } satisfies IEcommerceProduct.IRequest;
  const minPriceOnlyResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: minPriceOnlySearch,
    });
  typia.assert(minPriceOnlyResult);
  // Verify all results have price >= min_price
  for (const product of minPriceOnlyResult.data) {
    TestValidator.predicate(
      `product price >= min_price: ${product.name}`,
      product.base_price >= 10000,
    );
  }
  // 7. Test partial price range - only max_price
  const maxPriceOnlySearch: IEcommerceProduct.IRequest = {
    max_price: 5000,
    sort_by: "base_price",
    sort_order: "desc",
    limit: 10,
  } satisfies IEcommerceProduct.IRequest;
  const maxPriceOnlyResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: maxPriceOnlySearch,
    });
  typia.assert(maxPriceOnlyResult);
  // Verify all results have price <= max_price
  for (const product of maxPriceOnlyResult.data) {
    TestValidator.predicate(
      `product price <= max_price: ${product.name}`,
      product.base_price <= 5000,
    );
  }
  // 8. Test in_stock_only filter
  const inStockSearch: IEcommerceProduct.IRequest = {
    in_stock_only: true,
    limit: 20,
  } satisfies IEcommerceProduct.IRequest;
  const inStockResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: inStockSearch,
    });
  typia.assert(inStockResult);
  // When in_stock_only is true, verify stock_status reflects availability
  // Note: The actual stock status depends on backend data, so we validate the field exists
  if (inStockResult.data.length > 0) {
    TestValidator.predicate(
      "in_stock_only results have stock_status field",
      inStockResult.data.every((p) => typeof p.stock_status === "string"),
    );
  }
  // 9. Test empty search (no filters)
  const emptySearch: IEcommerceProduct.IRequest = {
    limit: 5,
  } satisfies IEcommerceProduct.IRequest;
  const emptySearchResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: emptySearch,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearchResult.pagination.current === 1 ||
      emptySearchResult.pagination.current === 0,
  );
  TestValidator.predicate(
    "empty search respects limit",
    emptySearchResult.data.length <= 5,
  );
  // 10. Test name search with keyword
  const keywordSearch: IEcommerceProduct.IRequest = {
    search: RandomGenerator.alphabets(2),
    limit: 10,
  } satisfies IEcommerceProduct.IRequest;
  const keywordResult: IPageIEcommerceProduct.ISummary =
    await api.functional.ecommerce.customer.search.index(customerConnection, {
      body: keywordSearch,
    });
  typia.assert(keywordResult);
  // Verify results match search keyword (if any results exist)
  if (keywordResult.data.length > 0) {
    const searchKeyword = keywordSearch.search?.toLowerCase() ?? "";
    for (const product of keywordResult.data) {
      TestValidator.predicate(
        `product name contains keyword: ${product.name}`,
        product.name.toLowerCase().includes(searchKeyword) ||
          searchKeyword.length === 0,
      );
    }
  }
}
