import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a super administrator can successfully query the list of administrator accounts with filtering and pagination.
 * 1. Authenticate as a super administrator using admin join endpoint
 * 2. Test various filter combinations (grade, status, search)
 * 3. Test pagination parameters and metadata
 * 4. Test sorting options
 * 5. Verify response structure and data integrity
 */
export async function test_api_admin_list_super_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // Create a regular admin for testing filters
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(regularAdminAuth);
  // 2. Test filtering by grade='super'
  const superAdminsResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        grade: "super",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(superAdminsResult);
  TestValidator.equals(
    "super admin filter returns super admins",
    superAdminsResult.data.every((admin) => admin.grade === "super"),
    true,
  );
  TestValidator.predicate(
    "super admin count is at least 1",
    superAdminsResult.data.length >= 1,
  );
  // 3. Test filtering by grade='regular'
  const regularAdminsResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        grade: "regular",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(regularAdminsResult);
  TestValidator.equals(
    "regular admin filter returns regular admins",
    regularAdminsResult.data.every((admin) => admin.grade === "regular"),
    true,
  );
  TestValidator.predicate(
    "regular admin count is at least 1",
    regularAdminsResult.data.length >= 1,
  );
  // 4. Test filtering by status='active'
  const activeAdminsResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        status: "active",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(activeAdminsResult);
  TestValidator.equals(
    "active status filter returns active admins",
    activeAdminsResult.data.every((admin) => admin.status === "active"),
    true,
  );
  // 5. Test filtering by status='banned' (should return empty)
  const bannedAdminsResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        status: "banned",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(bannedAdminsResult);
  TestValidator.equals(
    "banned status filter returns empty array",
    bannedAdminsResult.data.length,
    0,
  );
  TestValidator.equals(
    "banned filter pagination records is 0",
    bannedAdminsResult.pagination.records,
    0,
  );
  // 6. Test search by partial email match
  const searchEmail = superAdminAuth.email.split("@")[0];
  const searchResult = await api.functional.shoppingMall.admin.admins.index(
    superAdminConnection,
    {
      body: {
        search: searchEmail,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching admins",
    searchResult.data.some((admin) => admin.email.includes(searchEmail)),
  );
  // 7. Test pagination with custom limit
  const paginationResult = await api.functional.shoppingMall.admin.admins.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginationResult.data.length <= 10,
  );
  // 8. Test sorting by email ascending
  const sortEmailAscResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        sortBy: "email",
        sortOrder: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortEmailAscResult);
  if (sortEmailAscResult.data.length > 1) {
    TestValidator.predicate(
      "email ascending sort is correct",
      sortEmailAscResult.data.every(
        (admin, index, array) =>
          index === 0 || array[index - 1].email <= admin.email,
      ),
    );
  }
  // 9. Test sorting by created_at descending
  const sortDateDescResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortDateDescResult);
  if (sortDateDescResult.data.length > 1) {
    TestValidator.predicate(
      "created_at descending sort is correct",
      sortDateDescResult.data.every(
        (admin, index, array) =>
          index === 0 ||
          new Date(array[index - 1].created_at) >= new Date(admin.created_at),
      ),
    );
  }
  // 10. Test sorting by grade
  const sortGradeResult = await api.functional.shoppingMall.admin.admins.index(
    superAdminConnection,
    {
      body: {
        sortBy: "grade",
        sortOrder: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortGradeResult);
  TestValidator.predicate(
    "grade sort contains valid grades",
    sortGradeResult.data.every((admin) =>
      ["regular", "super"].includes(admin.grade),
    ),
  );
  // 11. Verify response structure (no sensitive fields)
  TestValidator.predicate(
    "response contains required fields",
    sortGradeResult.data.every(
      (admin) =>
        admin.id !== undefined &&
        admin.email !== undefined &&
        admin.grade !== undefined &&
        admin.status !== undefined &&
        admin.created_at !== undefined,
    ),
  );
  // 12. Verify pagination metadata calculation
  TestValidator.predicate(
    "pagination pages is correctly calculated",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
  // 13. Test combined filters (grade + status)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        grade: "super",
        status: "active",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns correct grade",
    combinedFilterResult.data.every((admin) => admin.grade === "super"),
    true,
  );
  TestValidator.equals(
    "combined filter returns correct status",
    combinedFilterResult.data.every((admin) => admin.status === "active"),
    true,
  );
  // 14. Verify empty result set with pagination
  const emptySearchResult =
    await api.functional.shoppingMall.admin.admins.index(superAdminConnection, {
      body: {
        search: "nonexistentemail12345",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records is 0",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pagination pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
}
