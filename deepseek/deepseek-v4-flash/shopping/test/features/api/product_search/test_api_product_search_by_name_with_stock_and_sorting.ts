import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test product search by name with stock availability filtering and sorting capabilities.
 *
 * Validates the customer-facing product search endpoint for name-based fuzzy matching, in-stock-only filtering, and sort ordering. The search endpoint uses ILIKE pattern matching on product names via GIN trigram indexing, and supports combined filters.
 *
 * Different sort orders are verified: newest (by created_at descending), price ascending (by effective price), and price descending (by effective price). An empty search case is also tested to validate correct pagination returns when no results match.
 *
 * 1. Register a customer to authenticate API calls.
 * 2. Search with "premium" keyword, newest sort — validate name match and response structure.
 * 3. Search with inStockOnly=true — verify results are a subset of all results.
 * 4. Search with price_asc sort — validate ascending base_price order.
 * 5. Search with price_desc sort — validate descending base_price order.
 * 6. Search with nonexistent keyword — validate empty pagination (records=0, pages=0, data=[]).
 */
export async function test_api_product_search_by_name_with_stock_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Register as customer for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 1. Search by "premium" keyword, sorted by newest
  const resultAll =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: "premium",
          sort: "newest",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultAll);
  for (const product of resultAll.data) {
    TestValidator.predicate(
      `product name matches search term: ${product.name}`,
      product.name.toLowerCase().includes("premium"),
    );
  }
  // 2. Filter by inStockOnly=true
  const resultInStock =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: "premium",
          inStockOnly: true,
          sort: "newest",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultInStock);
  if (resultAll.data.length > 0) {
    const allIds = new Set(resultAll.data.map((p) => p.id));
    TestValidator.predicate(
      "in-stock results are subset of all results",
      resultInStock.data.every((p) => allIds.has(p.id)),
    );
  }
  // 3. Sort by price ascending
  const resultPriceAsc =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: "premium",
          inStockOnly: true,
          sort: "price_asc",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultPriceAsc);
  if (resultPriceAsc.data.length > 1) {
    for (let i = 1; i < resultPriceAsc.data.length; i++) {
      TestValidator.predicate(
        `price ascending order at index ${i}`,
        resultPriceAsc.data[i - 1].base_price <=
          resultPriceAsc.data[i].base_price,
      );
    }
  }
  // 4. Sort by price descending
  const resultPriceDesc =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: "premium",
          inStockOnly: true,
          sort: "price_desc",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultPriceDesc);
  if (resultPriceDesc.data.length > 1) {
    for (let i = 1; i < resultPriceDesc.data.length; i++) {
      TestValidator.predicate(
        `price descending order at index ${i}`,
        resultPriceDesc.data[i - 1].base_price >=
          resultPriceDesc.data[i].base_price,
      );
    }
  }
  // 5. Search for nonexistent product keyword
  const resultEmpty =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          search: "nonexistent_product_xyz_123",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultEmpty);
  TestValidator.equals(
    "empty search records",
    0,
    resultEmpty.pagination.records,
  );
  TestValidator.equals("empty search pages", 0, resultEmpty.pagination.pages);
  TestValidator.equals("empty search data length", 0, resultEmpty.data.length);
  TestValidator.equals(
    "empty search current page",
    1,
    resultEmpty.pagination.current,
  );
}
