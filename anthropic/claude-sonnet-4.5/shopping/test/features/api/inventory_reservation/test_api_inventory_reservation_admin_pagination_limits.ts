import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryReservation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test pagination functionality with various page sizes and boundary
 * conditions.
 *
 * This test validates the pagination mechanism for inventory reservations by:
 *
 * 1. Authenticating as admin
 * 2. Testing various page sizes (1, 10, 50, 100)
 * 3. Testing different page numbers
 * 4. Validating pagination metadata accuracy
 * 5. Verifying limit constraints (1-100 range)
 * 6. Testing boundary conditions (last page, beyond available data)
 */
export async function test_api_inventory_reservation_admin_pagination_limits(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test pagination with limit of 10
  const page1Limit10 =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(page1Limit10);

  TestValidator.equals(
    "page 1 limit 10 - current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10 - records is non-negative",
    page1Limit10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 10 - pages calculated correctly",
    page1Limit10.pagination.pages ===
      Math.ceil(page1Limit10.pagination.records / 10),
  );
  TestValidator.predicate(
    "page 1 limit 10 - data length valid",
    page1Limit10.data.length <= 10 &&
      page1Limit10.data.length <= page1Limit10.pagination.records,
  );

  // Step 3: Test pagination with limit of 1
  const page1Limit1 =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(page1Limit1);

  TestValidator.equals(
    "page 1 limit 1 - current page",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 - limit",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "page 1 limit 1 - records is non-negative",
    page1Limit1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 1 - pages calculated correctly",
    page1Limit1.pagination.pages ===
      Math.ceil(page1Limit1.pagination.records / 1),
  );
  TestValidator.predicate(
    "page 1 limit 1 - data length at most 1",
    page1Limit1.data.length <= 1,
  );

  // Step 4: Test pagination with limit of 50
  const page1Limit50 =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(page1Limit50);

  TestValidator.equals(
    "page 1 limit 50 - current page",
    page1Limit50.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 50 - limit",
    page1Limit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "page 1 limit 50 - records is non-negative",
    page1Limit50.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 50 - pages calculated correctly",
    page1Limit50.pagination.pages ===
      Math.ceil(page1Limit50.pagination.records / 50),
  );
  TestValidator.predicate(
    "page 1 limit 50 - data length valid",
    page1Limit50.data.length <= 50,
  );

  // Step 5: Test pagination with limit of 100 (maximum)
  const page1Limit100 =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(page1Limit100);

  TestValidator.equals(
    "page 1 limit 100 - current page",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 - limit",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "page 1 limit 100 - records is non-negative",
    page1Limit100.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 100 - pages calculated correctly",
    page1Limit100.pagination.pages ===
      Math.ceil(page1Limit100.pagination.records / 100),
  );
  TestValidator.predicate(
    "page 1 limit 100 - data length valid",
    page1Limit100.data.length <= 100,
  );

  // Step 6: Test second page navigation
  if (page1Limit10.pagination.pages >= 2) {
    const page2Limit10 =
      await api.functional.shoppingMall.admin.inventoryReservations.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IShoppingMallInventoryReservation.IRequest,
        },
      );
    typia.assert(page2Limit10);

    TestValidator.equals(
      "page 2 limit 10 - current page",
      page2Limit10.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit 10 - limit",
      page2Limit10.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 limit 10 - total records consistent",
      page2Limit10.pagination.records,
      page1Limit10.pagination.records,
    );
    TestValidator.predicate(
      "page 2 limit 10 - data length valid",
      page2Limit10.data.length <= 10,
    );
  }

  // Step 7: Test last page with potential partial results
  if (page1Limit10.pagination.pages > 0) {
    const lastPage =
      await api.functional.shoppingMall.admin.inventoryReservations.index(
        connection,
        {
          body: {
            page: page1Limit10.pagination.pages,
            limit: 10,
          } satisfies IShoppingMallInventoryReservation.IRequest,
        },
      );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page - current page",
      lastPage.pagination.current,
      page1Limit10.pagination.pages,
    );
    TestValidator.equals("last page - limit", lastPage.pagination.limit, 10);
    TestValidator.predicate(
      "last page - data length valid",
      lastPage.data.length > 0 && lastPage.data.length <= 10,
    );
  }

  // Step 8: Test page beyond available data
  const beyondPage =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: page1Limit10.pagination.pages + 100,
          limit: 10,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(beyondPage);

  TestValidator.predicate(
    "beyond page - data length valid",
    beyondPage.data.length <= 10,
  );

  // Step 9: Test default pagination (no page/limit specified)
  const defaultPagination =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {} satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(defaultPagination);

  TestValidator.predicate(
    "default pagination - has valid metadata",
    defaultPagination.pagination.current >= 0 &&
      defaultPagination.pagination.limit >= 0 &&
      defaultPagination.pagination.records >= 0 &&
      defaultPagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default pagination - data length consistent with metadata",
    defaultPagination.data.length <= defaultPagination.pagination.limit,
  );
}
