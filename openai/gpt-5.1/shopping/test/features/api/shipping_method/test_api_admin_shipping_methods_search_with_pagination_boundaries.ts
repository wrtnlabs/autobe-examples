import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate admin shipping method search pagination boundaries and page metadata
 * consistency.
 *
 * Business goals:
 *
 * - Ensure an authenticated admin can search shipping methods with pagination.
 * - Verify that small page sizes (limit=5) return at most that many records.
 * - Validate that out-of-range pages return an empty data array while keeping
 *   pagination metadata (records/pages) consistent across requests.
 *
 * Steps:
 *
 * 1. Register an admin using POST /auth/admin/join; this both creates the admin
 *    and sets the Authorization header on the shared connection.
 * 2. As the admin, create multiple shipping methods (e.g., 15) using POST
 *    /shoppingMall/admin/shippingMethods with unique method_code values.
 * 3. Call PATCH /shoppingMall/admin/shippingMethods with page=0, limit=5 and
 *    capture pagination + data; assert data.length <= limit.
 * 4. Call the same endpoint with page=1, limit=5 and assert data.length <= limit.
 * 5. Call the endpoint again with an out-of-range page index (greater than the
 *    pages count from the first response) and verify:
 *
 *    - Data.length === 0 (no results for out-of-range page).
 *    - Pagination.records and pagination.pages match those from the first page.
 * 6. Cross-check that pagination metadata (records/pages) is consistent between
 *    page 0, page 1, and the out-of-range page.
 */
export async function test_api_admin_shipping_methods_search_with_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish Authorization on the connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed multiple shipping methods with unique method_code values
  const totalToCreate = 15;
  const createdMethods: IShoppingMallShippingMethod[] = [];

  for (let i = 0; i < totalToCreate; i++) {
    const methodBody = {
      method_code: `method_${RandomGenerator.alphaNumeric(8)}_${i}`,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      service_level_description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IShoppingMallShippingMethod.ICreate;

    const created: IShoppingMallShippingMethod =
      await api.functional.shoppingMall.admin.shippingMethods.create(
        connection,
        {
          body: methodBody,
        },
      );
    typia.assert(created);
    createdMethods.push(created);
  }

  TestValidator.predicate(
    "should have seeded at least the configured number of shipping methods",
    createdMethods.length >= totalToCreate,
  );

  // 3. Page 0 retrieval (limit=5)
  const limit = 5 as const;

  const page0Request = {
    page: 0,
    limit,
    search: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const page0: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: page0Request,
    });
  typia.assert(page0);

  TestValidator.predicate(
    "page 0 should have at most `limit` records",
    page0.data.length <= limit,
  );

  // 4. Page 1 retrieval (limit=5)
  const page1Request = {
    page: 1,
    limit,
    search: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const page1: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: page1Request,
    });
  typia.assert(page1);

  TestValidator.predicate(
    "page 1 should have at most `limit` records",
    page1.data.length <= limit,
  );

  // 5. Out-of-range page retrieval
  const basePagination = page0.pagination;
  const outOfRangePageIndex = basePagination.pages + 5;

  const outOfRangeRequest = {
    page: outOfRangePageIndex,
    limit,
    search: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const outOfRange: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: outOfRangeRequest,
    });
  typia.assert(outOfRange);

  // Expect empty data but consistent pagination metadata
  TestValidator.equals(
    "out-of-range page should return empty data array",
    outOfRange.data.length,
    0,
  );

  // 6. Cross-request consistency of pagination metadata
  TestValidator.equals(
    "pagination.records should be consistent between page 0 and page 1",
    page0.pagination.records,
    page1.pagination.records,
  );

  TestValidator.equals(
    "pagination.pages should be consistent between page 0 and page 1",
    page0.pagination.pages,
    page1.pagination.pages,
  );

  TestValidator.equals(
    "pagination.records should be consistent between page 0 and out-of-range page",
    page0.pagination.records,
    outOfRange.pagination.records,
  );

  TestValidator.equals(
    "pagination.pages should be consistent between page 0 and out-of-range page",
    page0.pagination.pages,
    outOfRange.pagination.pages,
  );
}
