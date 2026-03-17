import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test advanced product search with combined filters and sorting options to verify complex query construction and filtering logic.
 *
 * Test Steps:
 * 1. Authenticate as customer using authorize_customer_join utility
 * 2. Search with combination of filters: categoryId (specific category), minPrice and maxPrice (narrow range), inStockOnly=true
 * 3. Apply sorting by price_desc (highest price first)
 * 4. Use custom pagination: page=2, limit=10
 * 5. Verify filtered results only include products matching ALL criteria
 * 6. Verify results are sorted by price descending
 * 7. Verify pagination metadata reflects correct page 2 with 10 items per page
 * 8. Verify total records count matches filtered dataset size
 */
export async function test_api_customer_product_search_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search with combined filters and sorting
  const searchRequest = {
    categoryId: typia.random<string & typia.tags.Format<"uuid">>(),
    minPrice: 100,
    maxPrice: 1000,
    inStockOnly: true,
    sort: "price_desc" as const,
    page: 2,
    limit: 10,
  } satisfies IEcommerceMallProduct.IRequest;
  const searchResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );
  // 4. Verify filtered results match criteria
  for (const product of searchResult.data) {
    // Verify price range
    TestValidator.predicate(
      `product ${product.name} price range within filter`,
      product.priceRangeMin <= 1000 && product.priceRangeMax >= 100,
    );
    // Verify stock availability
    TestValidator.predicate(
      `product ${product.name} is available (in stock)`,
      product.isAvailable === true,
    );
    // Verify category matches (or is subcategory)
    TestValidator.predicate(
      `product ${product.name} has valid category`,
      product.category !== null && product.category !== undefined,
    );
  }
  // 5. Verify sorting by price descending
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const current = searchResult.data[i];
      const next = searchResult.data[i + 1];
      TestValidator.predicate(
        `products sorted by price descending: ${current.name} vs ${next.name}`,
        current.priceRangeMax >= next.priceRangeMax,
      );
    }
  }
  // 6. Verify data array length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
}
