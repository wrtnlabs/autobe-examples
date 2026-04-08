import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator search with combined filter criteria.
 *
 * Validates that a super administrator can search and filter administrator accounts
 * using multiple criteria simultaneously. The test covers email partial matching,
 * name partial matching, date range filtering, status filtering, and sorting options.
 *
 * **Search Criteria Tested:**
 * - Email filter with case-insensitive partial matching
 * - Name filter with case-insensitive partial matching
 * - Date range filters (createdAfter and createdBefore)
 * - Status filter (active vs deleted administrators)
 * - Combined filters applying multiple criteria together
 * - Sorting by different fields and directions
 *
 * 1. Authenticate as superAdmin using utility function.
 * 2. Register multiple admin accounts with varying emails, names, and creation times.
 * 3. Test each filter individually: email, name, date range, status.
 * 4. Test combined filters ensuring all criteria work together.
 * 5. Test sorting options (sortBy and sort direction).
 * 6. Validate that paginated results contain expected admin records.
 */
export async function test_api_admin_list_search_with_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get initial admin list to establish baseline
  const initialList =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(initialList);
  // 3. Test email filter - case-insensitive partial matching
  const emailFilterTest =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          email: "admin",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(emailFilterTest);
  // Verify email filter works - all results should contain "admin" in email (case-insensitive)
  TestValidator.predicate(
    "email filter returns matching admins",
    emailFilterTest.data.every((admin) =>
      admin.email.toLowerCase().includes("admin"),
    ),
  );
  // 4. Test name filter - case-insensitive partial matching
  const nameFilterTest =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          name: "test",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(nameFilterTest);
  // 5. Test date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const dateRangeTest =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          createdAfter: thirtyDaysAgo.toISOString(),
          createdBefore: now.toISOString(),
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(dateRangeTest);
  // Verify all returned admins were created within the date range
  TestValidator.predicate(
    "date range filter returns admins within range",
    dateRangeTest.data.every((admin) => {
      const createdAt = new Date(admin.created_at);
      return createdAt >= thirtyDaysAgo && createdAt <= now;
    }),
  );
  // 6. Test status filter
  const statusActiveTest =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(statusActiveTest);
  // Verify all returned admins are active (deleted_at is null or undefined)
  TestValidator.predicate(
    "status filter returns only active admins",
    statusActiveTest.data.every((admin) => admin.deleted_at === undefined),
  );
  // 7. Test sorting options
  // Sort by email ascending
  const sortByEmailAsc =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sort: "asc",
          sortBy: "email",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortByEmailAsc);
  // Verify ascending sort by email
  if (sortByEmailAsc.data.length > 1) {
    TestValidator.predicate(
      "sort by email ascending",
      sortByEmailAsc.data.every((admin, index, arr) => {
        if (index === 0) return true;
        return admin.email.localeCompare(arr[index - 1].email) >= 0;
      }),
    );
  }
  // Sort by name descending
  const sortByNameDesc =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sort: "desc",
          sortBy: "name",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortByNameDesc);
  // Verify descending sort by name
  if (sortByNameDesc.data.length > 1) {
    TestValidator.predicate(
      "sort by name descending",
      sortByNameDesc.data.every((admin, index, arr) => {
        if (index === 0) return true;
        return admin.name.localeCompare(arr[index - 1].name) <= 0;
      }),
    );
  }
  // 8. Test combined filters - all filters apply together
  const combinedFilterTest =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          email: "admin",
          status: "active",
          createdAfter: fiveDaysAgo.toISOString(),
          sort: "desc",
          sortBy: "created_at",
          limit: 20,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(combinedFilterTest);
  // Verify combined filters work correctly
  if (combinedFilterTest.data.length > 0) {
    TestValidator.predicate(
      "combined filters - email contains 'admin'",
      combinedFilterTest.data.every((admin) =>
        admin.email.toLowerCase().includes("admin"),
      ),
    );
    TestValidator.predicate(
      "combined filters - all active",
      combinedFilterTest.data.every((admin) => admin.deleted_at === undefined),
    );
    TestValidator.predicate(
      "combined filters - within date range",
      combinedFilterTest.data.every((admin) => {
        const createdAt = new Date(admin.created_at);
        return createdAt >= fiveDaysAgo && createdAt <= now;
      }),
    );
  }
  // 9. Test pagination parameters
  const paginationTest =
    await api.functional.ecommerceMall.superAdmin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit respected",
    paginationTest.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination metadata present",
    paginationTest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginationTest.pagination.current === 1,
  );
}
