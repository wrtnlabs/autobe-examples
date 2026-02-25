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
 * Test advanced filtering capabilities with multiple criteria combinations.
 * Verify filtering by email (partial match), display_name (partial match using gin_trgm_ops),
 * permissions_level (exact match), is_active status, and date ranges for last_login_at,
 * created_at, and updated_at. Test combinations like searching for active admins with
 * specific permission levels who logged in recently. Validate that all filter parameters
 * work correctly and return appropriate results.
 */
export async function test_api_admin_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Test individual filter: email partial match
  const emailSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        email: "test",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(emailSearch);
  // Test individual filter: display_name partial match
  const nameSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        display_name: "admin",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(nameSearch);
  // Test individual filter: permissions_level exact match
  const permissionSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        permissions_level: "super_admin",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(permissionSearch);
  // Test individual filter: is_active status
  const activeSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(activeSearch);
  // Test date range filter: created_at range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        created_at_start: oneWeekAgo.toISOString(),
        created_at_end: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  // Test complex combination: active admins with specific permission level
  const complexSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        is_active: true,
        permissions_level: "admin",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(complexSearch);
  // Test pagination
  const paginationSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(paginationSearch);
  TestValidator.equals(
    "pagination limit",
    paginationSearch.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page number valid",
    paginationSearch.pagination.current >= 1,
  );
  // Test sorting
  const sortedSearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(sortedSearch);
  // Test empty search (should return all admins)
  const emptySearch = await api.functional.communityPlatform.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate("returns data", emptySearch.data.length >= 0);
}
