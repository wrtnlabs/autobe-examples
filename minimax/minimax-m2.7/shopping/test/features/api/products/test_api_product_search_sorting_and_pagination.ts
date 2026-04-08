import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

interface IPaginationSnapshot {
  current: number;
  limit: number;
  records: number;
  pages: number;
}

export async function test_api_product_search_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Test sort by 'newest' - default sorting
  const newestResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(newestResults);
  // Validate newest sort order (createdAt descending)
  for (let i = 1; i < newestResults.data.length; i++) {
    const prev = new Date(newestResults.data[i - 1].createdAt).getTime();
    const curr = new Date(newestResults.data[i].createdAt).getTime();
    TestValidator.predicate(
      "newest sort: createdAt should be descending",
      prev >= curr,
    );
  }
  // 3. Test sort by 'price_asc'
  const priceAscResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          sort: "price_asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceAscResults);
  // Validate price ascending sort order
  for (let i = 1; i < priceAscResults.data.length; i++) {
    const prev = priceAscResults.data[i - 1].basePrice;
    const curr = priceAscResults.data[i].basePrice;
    TestValidator.predicate(
      "price_asc sort: basePrice should be ascending",
      prev <= curr,
    );
  }
  // 4. Test sort by 'price_desc'
  const priceDescResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          sort: "price_desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceDescResults);
  // Validate price descending sort order
  for (let i = 1; i < priceDescResults.data.length; i++) {
    const prev = priceDescResults.data[i - 1].basePrice;
    const curr = priceDescResults.data[i].basePrice;
    TestValidator.predicate(
      "price_desc sort: basePrice should be descending",
      prev >= curr,
    );
  }
  // 5. Test pagination - Page 1 with limit 10
  const page1Results =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(page1Results);
  const page1Pagination = page1Results.pagination as unknown as IPaginationSnapshot;
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page should be 1",
    page1Pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 10",
    page1Pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 data count should be <= limit",
    page1Results.data.length <= 10,
  );
  TestValidator.predicate(
    "page 1 records should be >= 0",
    page1Pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages should be >= 0",
    page1Pagination.pages >= 0,
  );
  // 6. Test pagination - Page 2 with limit 10
  const page2Results =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(page2Results);
  const page2Pagination = page2Results.pagination as unknown as IPaginationSnapshot;
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page should be 2",
    page2Pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 10",
    page2Pagination.limit,
    10,
  );
  // Verify page 1 and page 2 have different products (if there are more than 10 products)
  if (page1Pagination.records > 10) {
    const page1Ids = page1Results.data.map((p) => p.id);
    const page2Ids = page2Results.data.map((p) => p.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    TestValidator.equals(
      "page 1 and page 2 should have no overlapping products",
      overlap.length,
      0,
    );
  }
  // 7. Test default pagination (page=1, limit=20)
  const defaultResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(defaultResults);
  const defaultPagination = defaultResults.pagination as unknown as IPaginationSnapshot;
  // Validate default pagination values
  TestValidator.equals(
    "default current page should be 1",
    defaultPagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPagination.limit,
    20,
  );
  // 8. Validate pages calculation
  if (defaultPagination.records > 0) {
    const expectedPages = Math.ceil(
      defaultPagination.records / defaultPagination.limit,
    );
    TestValidator.equals(
      "pages should be calculated correctly",
      defaultPagination.pages,
      expectedPages,
    );
  }
}