import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering administrators by grade and status with search terms.
 *
 * 1. Authenticate as an admin
 * 2. Create additional admin accounts to ensure sufficient test data
 * 3. Test filter by grade only ('regular' or 'super_admin')
 * 4. Test filter by status only ('active', 'suspended', or 'banned')
 * 5. Test search by email substring with trigram matching
 * 6. Test search by nickname substring
 * 7. Test combined filters with date range (createdAtMin, createdAtMax)
 * 8. Verify filtering logic correctly applies AND conditions between filter types
 */
export async function test_api_admin_list_filtered_by_grade_status_search(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create additional admin accounts to ensure test data
  const additionalAdmins: IEcommerceMallAdmin.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const admin = await authorize_admin_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
    typia.assert(admin);
    additionalAdmins.push(admin);
  }
  // 1. Test filter by grade only - regular
  const byRegular = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "regular",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(byRegular);
  // Validate all returned admins have grade matching 'regular'
  for (const admin of byRegular.data) {
    TestValidator.equals(
      "grade matches regular filter",
      admin.grade,
      "regular",
    );
  }
  // 2. Test filter by grade only - super_admin
  const bySuperAdmin = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "super_admin",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(bySuperAdmin);
  for (const admin of bySuperAdmin.data) {
    TestValidator.equals(
      "grade matches super_admin filter",
      admin.grade,
      "super_admin",
    );
  }
  // 3. Test filter by status only - active
  const byActive = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(byActive);
  for (const admin of byActive.data) {
    TestValidator.equals(
      "status matches active filter",
      admin.status,
      "active",
    );
  }
  // 4. Test filter by status only - suspended
  const bySuspended = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "suspended",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(bySuspended);
  for (const admin of bySuspended.data) {
    TestValidator.equals(
      "status matches suspended filter",
      admin.status,
      "suspended",
    );
  }
  // 5. Test filter by status only - banned
  const byBanned = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        status: "banned",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(byBanned);
  for (const admin of byBanned.data) {
    TestValidator.equals(
      "status matches banned filter",
      admin.status,
      "banned",
    );
  }
  // 6. Test search by email substring (using email of a created admin)
  if (additionalAdmins.length > 0) {
    const targetAdmin = additionalAdmins[0];
    const emailPrefix = targetAdmin.email.split("@")[0] ?? "";
    const searchTerm = emailPrefix.substring(
      0,
      Math.min(5, emailPrefix.length),
    );
    const byEmailSearch = await api.functional.ecommerceMall.admin.admins.index(
      adminConnection,
      {
        body: {
          email: searchTerm,
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
    typia.assert(byEmailSearch);
    // If results found, verify search matches
    if (byEmailSearch.data.length > 0) {
      TestValidator.predicate(
        "email search returns results with matching email",
        () => byEmailSearch.data.some((a) => a.email.includes(searchTerm)),
      );
    }
  }
  // 7. Test search by nickname (partial search)
  const searchTerm = RandomGenerator.name();
  const byNicknameSearch =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        search: searchTerm,
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(byNicknameSearch);
  // 8. Test combined filters with date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const combined = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "regular",
        status: "active",
        createdAtMin: oneDayAgo.toISOString(),
        createdAtMax: oneDayFromNow.toISOString(),
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(combined);
  // Verify combined filter results match ALL conditions (AND logic)
  for (const admin of combined.data) {
    TestValidator.equals(
      "combined filter - grade matches",
      admin.grade,
      "regular",
    );
    TestValidator.equals(
      "combined filter - status matches",
      admin.status,
      "active",
    );
    const createdAt = new Date(admin.createdAt).getTime();
    TestValidator.predicate(
      "createdAt within min range",
      createdAt >= oneDayAgo.getTime(),
    );
    TestValidator.predicate(
      "createdAt within max range",
      createdAt <= oneDayFromNow.getTime(),
    );
  }
  // 9. Test pagination parameters
  const paginated = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals("pagination limit", paginated.pagination.limit, 10);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  // 10. Test with includeDeleted flag
  const withDeleted = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        includeDeleted: true,
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(withDeleted);
  // 11. Test sorting by different fields
  const sortedByGrade = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        sortBy: "grade",
        sortOrder: "asc",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(sortedByGrade);
  const sortedByStatus = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        sortBy: "status",
        sortOrder: "desc",
        limit: 100,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(sortedByStatus);
}
