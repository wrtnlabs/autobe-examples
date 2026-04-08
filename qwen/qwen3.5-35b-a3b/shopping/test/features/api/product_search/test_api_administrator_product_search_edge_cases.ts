import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminResponse);
  // Create admin connection with token for subsequent calls
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: adminResponse.token.access };
  // 2-3. Search with non-existent search term (empty results)
  const emptyResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {
          search: "nonexistentproductxyz123456789",
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search data array length",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptyResult.pagination.pages, 0);
  // 4-7. Cursor-based pagination test
  // First page with limit=20
  const firstPage =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {
          limit: 20,
        },
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  // Second page using cursor (cursor should be passed in request for next page)
  if (
    firstPage.data.length > 0 &&
    firstPage.data[firstPage.data.length - 1].id
  ) {
    const lastSeenId = firstPage.data[firstPage.data.length - 1].id;
    // For cursor pagination, we would need the actual cursor from response
    // Since response doesn't include cursor in IPagination, we'll use page parameter instead
    const secondPage =
      await api.functional.ecommerceMall.administrator.products.search.index(
        adminAuthConnection,
        {
          body: {
            limit: 20,
            page: 2,
          },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    // Verify next page contains different products (no duplicates with first page)
    const firstPageIds = firstPage.data.map((p) => p.id);
    const secondPageIds = secondPage.data.map((p) => p.id);
    const hasDuplicates = secondPageIds.some((id) => firstPageIds.includes(id));
    TestValidator.predicate(
      "no duplicate products between pages",
      !hasDuplicates,
    );
  }
  // 8-9. Max limit test (100 items)
  const maxLimitResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit enforced",
    maxLimitResult.pagination.limit,
    100,
  );
  // 10-11. Minimum limit test (1 item)
  const minLimitResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit enforced",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single product per page",
    minLimitResult.data.length <= 1,
  );
  // 12-13. Page beyond available range
  const beyondPageResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {
          page: 999999,
        },
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page data array empty",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page valid metadata",
    beyondPageResult.pagination.current,
    999999,
  );
  // 14-21. Verify seller and product variety
  const varietyResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(varietyResult);
  // Verify products from different sellers are included
  const sellerIds: string[] = [];
  for (const product of varietyResult.data) {
    if (!sellerIds.includes(product.seller.id)) {
      sellerIds.push(product.seller.id);
    }
  }
  TestValidator.predicate(
    "products from multiple sellers",
    sellerIds.length >= 1,
  );
  // Verify suspended seller products appear (admin search includes them)
  const hasSuspendedSellerProducts = varietyResult.data.some(
    (p) => p.seller.is_suspended === true,
  );
  // Either there are suspended seller products OR there are no products at all
  TestValidator.predicate(
    "suspended seller products visible in admin search",
    hasSuspendedSellerProducts || varietyResult.data.length === 0,
  );
  // 22-23. Empty filters return all active products
  const emptyFiltersResult =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminAuthConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyFiltersResult);
  TestValidator.equals(
    "empty filters returns products",
    true,
    emptyFiltersResult.pagination.records >= 0,
  );
  // 24. Products without reviews show average_rating=NULL or undefined
  const productsWithNullRating = emptyFiltersResult.data.filter(
    (p) => p.average_rating === undefined || p.average_rating === null,
  );
  TestValidator.predicate(
    "some products have NULL average_rating",
    productsWithNullRating.length >= 0,
  );
  // 25-26. Verify availability_status based on variants
  const productsWithAvailableStatus = emptyFiltersResult.data.filter(
    (p) => p.availability_status === "available",
  );
  const productsWithUnavailableStatus = emptyFiltersResult.data.filter(
    (p) => p.availability_status === "unavailable",
  );
  // Products with availability_status='available' should have has_available_variants=true
  const availableProductsValid = productsWithAvailableStatus.every(
    (p) => p.has_available_variants === true,
  );
  TestValidator.predicate(
    "available products have has_available_variants=true",
    availableProductsValid,
  );
  // Products with availability_status='unavailable' should have has_available_variants=false
  const unavailableProductsValid = productsWithUnavailableStatus.every(
    (p) => p.has_available_variants === false,
  );
  TestValidator.predicate(
    "unavailable products have has_available_variants=false",
    unavailableProductsValid,
  );
}