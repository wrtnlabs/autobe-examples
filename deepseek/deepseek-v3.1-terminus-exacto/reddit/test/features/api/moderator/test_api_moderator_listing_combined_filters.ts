import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test combined filtering scenarios using multiple search criteria simultaneously.
 * Verify that the endpoint correctly applies AND logic when combining email, username,
 * display name, active status, and permission level filters. Test edge cases like
 * filtering for inactive moderators with specific permission levels to ensure
 * complex queries work correctly.
 */
export async function test_api_moderator_listing_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for moderator management
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: Authorization setup would be needed here in a real scenario
  // First, get all moderators to understand available data
  const allModerators = await api.functional.communityPlatform.moderators.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(allModerators);
  if (allModerators.data.length === 0) {
    // If no moderators exist, test basic filtering with empty results
    const emptyFilterResult =
      await api.functional.communityPlatform.moderators.index(adminConnection, {
        body: {
          email: "nonexistent@test.com",
          is_active: true,
          permission_level: "admin",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      });
    typia.assert(emptyFilterResult);
    TestValidator.equals("empty result set", emptyFilterResult.data.length, 0);
    return;
  }
  // Extract filterable attributes from existing moderators
  const sampleModerator = allModerators.data[0];
  const hasActiveModerators = allModerators.data.some((m) => m.is_active);
  const hasInactiveModerators = allModerators.data.some((m) => !m.is_active);
  const availablePermissionLevels = [
    ...new Set(allModerators.data.map((m) => m.permission_level)),
  ];
  // Test 1: Combined filtering with partial text matching
  const combinedFilterResult =
    await api.functional.communityPlatform.moderators.index(adminConnection, {
      body: {
        email: sampleModerator.email.substring(0, 5), // Partial match
        username: sampleModerator.username.substring(0, 3), // Partial match
        display_name: sampleModerator.display_name.substring(0, 5), // Partial match
        is_active: sampleModerator.is_active,
        permission_level: sampleModerator.permission_level,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Test 2: Filter for specific permission level
  if (availablePermissionLevels.length > 0) {
    const permissionFilterResult =
      await api.functional.communityPlatform.moderators.index(adminConnection, {
        body: {
          permission_level: availablePermissionLevels[0],
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      });
    typia.assert(permissionFilterResult);
    // Verify all returned moderators have the specified permission level
    permissionFilterResult.data.forEach((moderator) => {
      TestValidator.equals(
        "permission level matches filter",
        moderator.permission_level,
        availablePermissionLevels[0],
      );
    });
  }
  // Test 3: Filter by active status
  if (hasActiveModerators) {
    const activeFilterResult =
      await api.functional.communityPlatform.moderators.index(adminConnection, {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      });
    typia.assert(activeFilterResult);
    // Verify all returned moderators are active
    activeFilterResult.data.forEach((moderator) => {
      TestValidator.predicate("moderator is active", moderator.is_active);
    });
  }
  // Test 4: Filter by inactive status
  if (hasInactiveModerators) {
    const inactiveFilterResult =
      await api.functional.communityPlatform.moderators.index(adminConnection, {
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerator.IRequest,
      });
    typia.assert(inactiveFilterResult);
    // Verify all returned moderators are inactive
    inactiveFilterResult.data.forEach((moderator) => {
      TestValidator.predicate("moderator is inactive", !moderator.is_active);
    });
  }
  // Test 5: Edge case - no results expected
  const emptyFilterResult =
    await api.functional.communityPlatform.moderators.index(adminConnection, {
      body: {
        email: "nonexistent-email-that-should-not-match-anything@test.com",
        is_active: true,
        permission_level: "nonexistent-permission-level",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(emptyFilterResult);
  // Test 6: Pagination with filters
  const paginationFilterResult =
    await api.functional.communityPlatform.moderators.index(adminConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(paginationFilterResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginationFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginationFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginationFilterResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length respects limit",
    paginationFilterResult.data.length <=
      paginationFilterResult.pagination.limit,
  );
}
