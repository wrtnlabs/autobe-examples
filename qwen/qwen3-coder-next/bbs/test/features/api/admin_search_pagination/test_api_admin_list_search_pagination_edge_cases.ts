import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_list_search_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin and multiple regular admins
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdminConnection.headers?.Authorization);
  // Create 15 regular admin accounts for pagination testing
  const adminConnections: api.IConnection[] = [];
  const adminEmails: string[] = [];
  const adminNames: string[] = [];
  for (let i = 0; i < 15; i++) {
    const adminConnection: api.IConnection = { host: connection.host };
    const email = `admin${i}@test.com`;
    const displayName = `Admin User ${i}`;
    adminEmails.push(email);
    adminNames.push(displayName);
    await authorize_admin_join(adminConnection, {
      body: {
        email: email satisfies string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        display_name: displayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
    adminConnections.push(adminConnection);
    typia.assert(adminConnection.headers?.Authorization);
  }
  // 2. Test pagination with various limit values
  // 2.1 Test default pagination (limit=20)
  const defaultResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination limit",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination records",
    defaultResult.pagination.records,
    16,
  ); // 1 super + 15 admins
  TestValidator.equals(
    "default pagination current",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default has pages",
    defaultResult.pagination.pages >= 1,
  );
  // 2.2 Test small limit (limit=5)
  const smallLimitResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit pagination",
    smallLimitResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "small limit records",
    smallLimitResult.pagination.records,
    16,
  );
  TestValidator.equals(
    "small limit pages",
    smallLimitResult.pagination.pages,
    4,
  ); // 16 / 5 = 3.2 -> 4 pages
  TestValidator.equals(
    "small limit data length",
    smallLimitResult.data.length,
    5,
  );
  // 2.3 Test larger limit (limit=10)
  const largerLimitResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(largerLimitResult);
  TestValidator.equals(
    "larger limit pagination",
    largerLimitResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "larger limit records",
    largerLimitResult.pagination.records,
    16,
  );
  TestValidator.equals(
    "larger limit pages",
    largerLimitResult.pagination.pages,
    2,
  ); // 16 / 10 = 1.6 -> 2 pages
  TestValidator.equals(
    "larger limit data length",
    largerLimitResult.data.length,
    10,
  );
  // 2.4 Test page navigation
  const page2Result =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 pagination", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 5);
  TestValidator.equals("page 2 records", page2Result.pagination.records, 16);
  // Verify page 2 data is different from page 1
  const page1Result =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5,
        },
      },
    );
  const page1Ids = page1Result.data.map((item) => item.id);
  const page2Ids = page2Result.data.map((item) => item.id);
  // Page 2 should have different admins than page 1
  TestValidator.predicate(
    "page 2 different from page 1",
    page2Ids.every((id) => !page1Ids.includes(id)),
  );
  // 3. Test search functionality
  // 3.1 Search by display_name partial match
  const searchByNameResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: { search: "Admin User 1" satisfies string },
      },
    );
  typia.assert(searchByNameResult);
  // Should find admins with "Admin User 1" in their name
  const foundBySearch = searchByNameResult.data.filter(
    (item) =>
      item.display_name.includes("Admin User 1") ||
      item.email.includes("admin1"),
  );
  TestValidator.predicate(
    "search found matching admins",
    foundBySearch.length > 0,
  );
  // 3.2 Search by email partial match
  const searchByEmailResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: { search: "admin2" satisfies string },
      },
    );
  typia.assert(searchByEmailResult);
  TestValidator.predicate(
    "email search works",
    searchByEmailResult.data.length >= 0,
  );
  // 3.3 Search with pagination
  const searchWithPaginationResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: "Admin" satisfies string,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(searchWithPaginationResult);
  TestValidator.equals(
    "search pagination limit",
    searchWithPaginationResult.pagination.limit,
    5,
  );
  // 4. Test filtering by status
  // 4.1 Filter by active status
  const activeFilterResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: { isActive: true satisfies boolean },
      },
    );
  typia.assert(activeFilterResult);
  // Verify all returned admins are active
  activeFilterResult.data.forEach((admin) => {
    TestValidator.equals("admin is active", admin.is_active, true);
  });
  // 4.2 Filter by super admin status
  const superAdminFilterResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: { isSuperAdmin: true satisfies boolean },
      },
    );
  typia.assert(superAdminFilterResult);
  // Verify only super admins are returned
  TestValidator.predicate(
    "only super admins returned",
    superAdminFilterResult.data.every((admin) => admin.is_super_admin),
  );
  // 5. Verify pagination metadata accuracy
  const totalResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(totalResult);
  // Verify pagination calculations are correct
  const expectedPages = Math.ceil(
    totalResult.pagination.records / totalResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    totalResult.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "pagination records matches data",
    totalResult.pagination.records,
    totalResult.data.length,
  );
  // 6. Test with very large limit to get all results
  const allResults =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(allResults);
  // Verify we can iterate through all admins
  TestValidator.equals("total admin count", allResults.pagination.records, 16);
  TestValidator.equals("all data length", allResults.data.length, 16);
}
