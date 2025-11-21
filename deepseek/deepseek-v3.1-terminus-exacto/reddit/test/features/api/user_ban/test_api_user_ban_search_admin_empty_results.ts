import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserBan";

/**
 * Test user ban search returning empty results when no bans match criteria.
 *
 * This test validates that the admin ban search API properly handles scenarios
 * where no ban records match the specified filters. The test creates an admin
 * account, performs a ban search with filters that should yield no results, and
 * verifies that the API returns an empty result set with proper pagination
 * metadata indicating zero records found.
 */
export async function test_api_user_ban_search_admin_empty_results(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Perform ban search with filters that should yield no results
  // Use a date range in the far future where no bans should exist
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year in future

  const searchResult =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_at_start: futureDate, // No bans created in the future
        created_at_end: futureDate,
        search: "nonexistent_ban_reason_12345_unique_search_term", // Search term that shouldn't match any ban
        banned_member_name: "nonexistent_user_99999", // User that doesn't exist
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(searchResult);

  // 3. Validate empty result set
  TestValidator.equals("data array should be empty", searchResult.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    searchResult.pagination.pages,
    0,
  );

  // 4. Test additional edge case with impossible date combination
  // Use start date after end date to ensure no results
  const startDate = new Date("2025-01-01").toISOString();
  const endDate = new Date("2024-01-01").toISOString(); // End date before start date

  const impossibleDateSearchResult =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 1,
        limit: 5,
        created_at_start: startDate,
        created_at_end: endDate, // Invalid date range (start > end)
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(impossibleDateSearchResult);

  // Validate this search also returns empty results
  TestValidator.equals(
    "impossible date range search data array should be empty",
    impossibleDateSearchResult.data,
    [],
  );
  TestValidator.equals(
    "impossible date range pagination records should be 0",
    impossibleDateSearchResult.pagination.records,
    0,
  );
}
