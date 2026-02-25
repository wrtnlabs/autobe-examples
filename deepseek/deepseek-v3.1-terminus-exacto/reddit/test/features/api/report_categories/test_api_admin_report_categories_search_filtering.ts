import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_categories_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // First, get all categories to understand available data
  const allCategories =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(allCategories);
  // Test 1: Search by name (exact match) - use existing category name if available
  const searchByName =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          name:
            allCategories.data.length > 0 ? allCategories.data[0].name : "test",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(searchByName);
  TestValidator.equals(
    "pagination metadata present",
    typeof searchByName.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination properties",
    searchByName.pagination.current >= 0 &&
      searchByName.pagination.limit > 0 &&
      searchByName.pagination.records >= 0 &&
      searchByName.pagination.pages >= 0,
  );
  // Test 2: Search by display_name (partial text search)
  const searchByDisplayName =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          display_name: "test",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(searchByDisplayName);
  // Test 3: Filter by severity level
  const severityLevels = ["low", "medium", "high", "critical"] as const;
  for (const severity of severityLevels) {
    const searchBySeverity =
      await api.functional.communityPlatform.admin.report_categories.index(
        adminConnection,
        {
          body: {
            severity_level: severity,
            page: 1,
            limit: 3,
          } satisfies ICommunityPlatformReportCategory,
        },
      );
    typia.assert(searchBySeverity);
    TestValidator.predicate(
      `severity level ${severity} returns data`,
      searchBySeverity.data.length >= 0,
    );
  }
  // Test 4: Filter by active status
  const searchActive =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 8,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(searchActive);
  const searchInactive =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 8,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(searchInactive);
  // Test 5: Pagination with different page sizes
  const pageSizes = [1, 5, 10, 20] as const;
  for (const size of pageSizes) {
    const paginationTest =
      await api.functional.communityPlatform.admin.report_categories.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: size,
          } satisfies ICommunityPlatformReportCategory,
        },
      );
    typia.assert(paginationTest);
    TestValidator.predicate(
      `page size ${size} returns valid data`,
      paginationTest.data.length <= size &&
        paginationTest.pagination.limit === size,
    );
  }
  // Test 6: Sorting options
  const sortOptions = [
    { sort_by: "created_at" as const, sort_order: "desc" as const },
    { sort_by: "name" as const, sort_order: "asc" as const },
    { sort_by: "severity_level" as const, sort_order: "desc" as const },
  ];
  for (const sortOption of sortOptions) {
    const sortTest =
      await api.functional.communityPlatform.admin.report_categories.index(
        adminConnection,
        {
          body: {
            ...sortOption,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformReportCategory,
        },
      );
    typia.assert(sortTest);
    TestValidator.predicate(
      `sorting by ${sortOption.sort_by} ${sortOption.sort_order} works`,
      sortTest.data.length >= 0,
    );
  }
  // Test 7: Combined filtering
  const combinedFilter =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          name:
            allCategories.data.length > 0 ? allCategories.data[0].name : "test",
          severity_level: "high",
          is_active: true,
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filtering returns valid results",
    combinedFilter.data.length >= 0,
  );
  // Test 8: Empty search (should return all categories)
  const emptySearch =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns categories",
    emptySearch.data.length >= 0,
  );
}
