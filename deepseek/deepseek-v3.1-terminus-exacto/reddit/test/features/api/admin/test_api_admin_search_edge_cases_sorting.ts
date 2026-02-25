import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test edge cases including empty result sets, sorting options, and boundary conditions.
 * Verify behavior when no admins match search criteria (empty data array with proper pagination metadata).
 * Test sorting by created_at (default), last_login_at, and display_name with both ascending and descending orders.
 * Validate handling of invalid filter combinations and ensure the system returns appropriate empty results rather than errors.
 */
export async function test_api_admin_search_edge_cases_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test empty result set with highly specific filter that cannot match any records
  const emptyResult1 = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        email: "nonexistent-email-that-will-never-match-any-record@example.com",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(emptyResult1);
  // Verify empty result set has proper pagination metadata
  TestValidator.equals(
    "empty result should have zero records",
    emptyResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result should have zero pages",
    emptyResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result should have empty data array",
    emptyResult1.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match requested",
    emptyResult1.pagination.limit,
    10,
  );
  // Test invalid filter combination that should return empty results
  const emptyResult2 = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        email: "test@example.com",
        display_name: "completely-different-name-that-wont-match",
        is_active: true,
        permissions_level: "super-admin",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(emptyResult2);
  // Test sorting by created_at (default) with ascending order
  const sortCreatedAsc = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortCreatedAsc);
  // Test sorting by created_at with descending order
  const sortCreatedDesc = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortCreatedDesc);
  // Test sorting by last_login_at with ascending order
  const sortLoginAsc = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        sort_by: "last_login_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortLoginAsc);
  // Test sorting by last_login_at with descending order
  const sortLoginDesc = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        sort_by: "last_login_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortLoginDesc);
  // Test sorting by display_name with ascending order
  const sortNameAsc = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortNameAsc);
  // Test sorting by display_name with descending order
  const sortNameDesc = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortNameDesc);
  // Test default sorting (should be created_at)
  const defaultSort = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(defaultSort);
  // Test boundary condition: minimum page number
  const minPage = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(minPage);
  // Test boundary condition: reasonable limit
  const reasonableLimit = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(reasonableLimit);
  // Test date range filter that should return empty results
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const emptyDateResult = await api.functional.communityPlatform.admins.index(
    connection,
    {
      body: {
        created_at_start: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(emptyDateResult);
  TestValidator.equals(
    "future date filter should return empty",
    emptyDateResult.data.length,
    0,
  );
  // Verify all responses have valid pagination structure
  const allResults = [
    emptyResult1,
    emptyResult2,
    sortCreatedAsc,
    sortCreatedDesc,
    sortLoginAsc,
    sortLoginDesc,
    sortNameAsc,
    sortNameDesc,
    defaultSort,
    minPage,
    reasonableLimit,
    emptyDateResult,
  ];
  for (const result of allResults) {
    TestValidator.predicate(
      "should have valid pagination metadata",
      result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
    // Validate each admin record in non-empty results
    if (result.data.length > 0) {
      for (const admin of result.data) {
        typia.assert(admin);
        TestValidator.predicate(
          "admin should have valid ID",
          typeof admin.id === "string" && admin.id.length > 0,
        );
      }
    }
  }
}
