import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin product listing with different sorting options and page navigation.
 *
 * Validates the admin product listing API supports various sorting options and pagination. The test verifies that sorting behavior correctly orders products by creation date (newest first) or base price (ascending/descending). Additionally validates pagination returns the correct subset of products with accurate metadata including current page, total records, and total pages.
 *
 * **Sorting Validation:**
 * - 'newest' sort: Products ordered by created_at DESC (most recent first)
 * - 'price_asc' sort: Products ordered by base_price ASC (lowest price first)
 * - 'price_desc' sort: Products ordered by base_price DESC (highest price first)
 *
 * **Pagination Validation:**
 * - Page 2 with limit 10 should return the second set of 10 products
 * - Pagination metadata should show correct current page, total records, and total pages
 *
 * 1. Authenticate as administrator using admin join endpoint.
 * 2. Fetch all products without pagination to get the total dataset for comparison.
 * 3. Test sorting with 'newest' and verify products are ordered by created_at descending.
 * 4. Test sorting with 'price_asc' and verify products are ordered by base_price ascending.
 * 5. Test sorting with 'price_desc' and verify products are ordered by base_price descending.
 * 6. Test pagination by requesting page 2 with limit 10 and verify correct records are returned.
 * 7. Validate pagination metadata matches expected values (current page, total records, total pages).
 */
export async function test_api_admin_product_sorting_and_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Fetch all products first to get total dataset
  const allProductsResponse =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(allProductsResponse);
  const totalProducts = allProductsResponse.data;
  const totalRecords = allProductsResponse.pagination.records;
  // 3. Test sorting by 'newest' (created_at DESC)
  const newestResponse =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "newest",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(newestResponse);
  // Verify products are sorted by created_at descending
  if (newestResponse.data.length > 1) {
    for (let i = 0; i < newestResponse.data.length - 1; i++) {
      const current = new Date(newestResponse.data[i].createdAt).getTime();
      const next = new Date(newestResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "newest sort: created_at should be descending",
        current >= next,
      );
    }
  }
  // 4. Test sorting by 'price_asc' (base_price ASC)
  const priceAscResponse =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "price_asc",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceAscResponse);
  // Verify products are sorted by base_price ascending
  if (priceAscResponse.data.length > 1) {
    for (let i = 0; i < priceAscResponse.data.length - 1; i++) {
      const current = priceAscResponse.data[i].basePrice;
      const next = priceAscResponse.data[i + 1].basePrice;
      TestValidator.predicate(
        "price_asc sort: base_price should be ascending",
        current <= next,
      );
    }
  }
  // 5. Test sorting by 'price_desc' (base_price DESC)
  const priceDescResponse =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "price_desc",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceDescResponse);
  // Verify products are sorted by base_price descending
  if (priceDescResponse.data.length > 1) {
    for (let i = 0; i < priceDescResponse.data.length - 1; i++) {
      const current = priceDescResponse.data[i].basePrice;
      const next = priceDescResponse.data[i + 1].basePrice;
      TestValidator.predicate(
        "price_desc sort: base_price should be descending",
        current >= next,
      );
    }
  }
  // 6. Test pagination - page 2 with limit 10
  const pageLimit = 10;
  const page2Response =
    await api.functional.ecommerceMall.admin.admin.products.index(
      adminConnection,
      {
        body: {
          sort: "newest",
          limit: pageLimit,
          page: 2,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(page2Response);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page2Response.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "pagination records should match total",
    page2Response.pagination.records,
    totalRecords,
  );
  // Calculate expected total pages
  const expectedPages = Math.ceil(totalRecords / pageLimit);
  TestValidator.equals(
    "pagination pages should be calculated correctly",
    page2Response.pagination.pages,
    expectedPages,
  );
  // If there are enough products, verify page 2 contains different products than page 1
  if (totalRecords > pageLimit) {
    const page1Response =
      await api.functional.ecommerceMall.admin.admin.products.index(
        adminConnection,
        {
          body: {
            sort: "newest",
            limit: pageLimit,
            page: 1,
          } satisfies IEcommerceMallProduct.IRequest,
        },
      );
    typia.assert(page1Response);
    // Verify page 1 and page 2 contain different products
    const page1Ids = page1Response.data.map((p) => p.id);
    const page2Ids = page2Response.data.map((p) => p.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    TestValidator.equals(
      "page 1 and page 2 should not overlap",
      overlap.length,
      0,
    );
  }
}
