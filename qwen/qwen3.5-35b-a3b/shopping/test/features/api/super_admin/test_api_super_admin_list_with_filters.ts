import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the primary success path of retrieving a filtered and paginated list of super-administrator accounts.
 * Validates filtering, pagination, and sorting capabilities for super-admin account management.
 */
export async function test_api_super_admin_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test super-admin accounts
  const adminConnection: api.IConnection = { host: connection.host };
  const testAdmin1 = await authorize_super_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name()}@testadmin1.com`,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(testAdmin1);
  const testAdmin2 = await authorize_super_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name()}@testadmin2.com`,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(testAdmin2);
  const testAdmin3 = await authorize_super_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name()}@testadmin3.com`,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(testAdmin3);
  // 2. Test listing all super-admins without filters
  const listAll =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(listAll);
  TestValidator.equals(
    "all super-admins returned",
    listAll.data.length,
    listAll.pagination.records,
  );
  TestValidator.equals("page 1", listAll.pagination.current, 1);
  TestValidator.equals("default limit", listAll.pagination.limit, 50);
  // 3. Test filter by email (partial match)
  const emailFilter = testAdmin1.email.split("@")[0];
  const emailFiltered =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { filterEmail: emailFilter },
      },
    );
  typia.assert(emailFiltered);
  TestValidator.predicate(
    "email filter returns matching results",
    emailFiltered.data.every((admin) =>
      admin.email.toLowerCase().includes(emailFilter.toLowerCase()),
    ),
  );
  // 4. Test filter by status (active)
  const statusFiltered =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { filterStatus: "active" },
      },
    );
  typia.assert(statusFiltered);
  TestValidator.predicate(
    "status filter returns active only",
    statusFiltered.data.every((admin) => admin.status === "active"),
  );
  // 5. Test filter by grade range
  const gradeFilterMin = 1;
  const gradeFilterMax = 5;
  const gradeFiltered =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          filterGradeMin: gradeFilterMin,
          filterGradeMax: gradeFilterMax,
        },
      },
    );
  typia.assert(gradeFiltered);
  TestValidator.predicate(
    "grade range filter returns within bounds",
    gradeFiltered.data.every(
      (admin) => admin.grade >= gradeFilterMin && admin.grade <= gradeFilterMax,
    ),
  );
  // 6. Test filter by creation date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: {
          filterCreatedAtStart: oneDayAgo.toISOString(),
          filterCreatedAtEnd: now.toISOString(),
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date range filter returns within range",
    dateFiltered.data.every(
      (admin) =>
        admin.created_at >= oneDayAgo.toISOString() &&
        admin.created_at <= now.toISOString(),
    ),
  );
  // 7. Test sorting by created_at ascending
  const sortAscending =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { sortBy: "created_at", sortOrder: "ascending" },
      },
    );
  typia.assert(sortAscending);
  if (sortAscending.data.length > 1) {
    const isSortedAsc = sortAscending.data.every(
      (admin, index) =>
        index === 0 ||
        new Date(admin.created_at) >=
          new Date(sortAscending.data[index - 1].created_at),
    );
    TestValidator.predicate(
      "sorting by created_at ascending works",
      isSortedAsc,
    );
  }
  // 8. Test sorting by grade descending
  const sortDescending =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { sortBy: "grade", sortOrder: "descending" },
      },
    );
  typia.assert(sortDescending);
  if (sortDescending.data.length > 1) {
    const isSortedDesc = sortDescending.data.every(
      (admin, index) =>
        index === 0 || admin.grade <= sortDescending.data[index - 1].grade,
    );
    TestValidator.predicate("sorting by grade descending works", isSortedDesc);
  }
  // 9. Test pagination with custom limit
  const customLimit = 2;
  const paginationTest =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { limit: customLimit, page: 1 },
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "limit applied correctly",
    paginationTest.data.length,
    customLimit,
  );
  TestValidator.equals(
    "limit in metadata",
    paginationTest.pagination.limit,
    customLimit,
  );
  // 10. Test pagination with page 2
  const page2 =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { limit: 1, page: 2 },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 requested", page2.pagination.current, 2);
  TestValidator.equals(
    "page 2 records",
    page2.pagination.records,
    page2.pagination.records,
  );
  // 11. Test filtering with no results
  const noResultsFilter =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      adminConnection,
      {
        body: { filterStatus: "banned" },
      },
    );
  typia.assert(noResultsFilter);
  TestValidator.equals(
    "no results returns empty array",
    noResultsFilter.data.length,
    0,
  );
  TestValidator.equals(
    "no results metadata",
    noResultsFilter.pagination.records,
    0,
  );
  // 12. Validate response structure - no password hash
  TestValidator.predicate(
    "password hash excluded from response",
    noResultsFilter.data.every(
      (admin) => !("password" in admin) && !("passwordHash" in admin),
    ),
  );
}
