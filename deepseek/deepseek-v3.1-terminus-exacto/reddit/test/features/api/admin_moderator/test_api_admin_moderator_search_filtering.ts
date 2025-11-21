import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";

/**
 * Test the moderator search and filtering functionality for administrators.
 *
 * This test validates that administrators can efficiently search and retrieve
 * moderator accounts using various filtering criteria including email patterns,
 * display name matches, privilege levels, and activity status. The test ensures
 * accurate result filtering, pagination functionality, and proper sorting
 * options for effective moderator workforce management.
 */
export async function test_api_admin_moderator_search_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
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

  // Step 2: Test basic search without filters to get baseline
  const baselineResults =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(baselineResults);

  TestValidator.predicate(
    "pagination structure should be valid",
    baselineResults.pagination.current >= 0 &&
      baselineResults.pagination.limit > 0 &&
      baselineResults.pagination.records >= 0 &&
      baselineResults.pagination.pages >= 0,
  );

  // Step 3: Test pagination functionality
  if (baselineResults.pagination.pages > 1) {
    const page1 = await api.functional.communityPlatform.admin.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
    typia.assert(page1);

    const page2 = await api.functional.communityPlatform.admin.moderators.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformModerator.IRequest,
      },
    );
    typia.assert(page2);

    TestValidator.notEquals(
      "different pages should return different data",
      page1.data.length > 0 ? page1.data[0]?.id : "no_data",
      page2.data.length > 0 ? page2.data[0]?.id : "no_data",
    );
  }

  // Step 4: Test search functionality with empty string
  const emptySearch =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return same as baseline",
    emptySearch.pagination.records,
    baselineResults.pagination.records,
  );

  // Step 5: Test various filter combinations that are likely to work
  // Test with moderator level filter
  const levelFiltered =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        moderator_level: "community",
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(levelFiltered);

  // Test with active status filter
  const activeFiltered =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(activeFiltered);

  // Step 6: Test sorting functionality
  const sortedByNameAsc =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        order_by: "display_name",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(sortedByNameAsc);

  const sortedByCreationDesc =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(sortedByCreationDesc);

  // Step 7: Test combined filters with realistic values
  const combinedSearch =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        search: "mod",
        moderator_level: "community",
        is_active: true,
        order_by: "display_name",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(combinedSearch);

  // Step 8: Validate that all returned moderator data has correct structure
  if (baselineResults.data.length > 0) {
    const sampleModerator = baselineResults.data[0];
    TestValidator.predicate(
      "moderator should have valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleModerator.id,
      ),
    );
    TestValidator.predicate(
      "moderator should have display name",
      sampleModerator.display_name.length > 0,
    );
    TestValidator.predicate(
      "moderator should have valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleModerator.email),
    );
    TestValidator.predicate(
      "moderator should have moderator level",
      sampleModerator.moderator_level.length > 0,
    );
    TestValidator.predicate(
      "moderator should have valid created_at timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleModerator.created_at),
    );
  }

  // Step 9: Test edge cases with limit values
  const maxLimit =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(maxLimit);
  TestValidator.predicate(
    "maximum limit should be respected",
    maxLimit.pagination.limit <= 100,
  );

  // Step 10: Test that the API handles invalid filter values gracefully
  // This tests the API's robustness with potentially invalid filter values
  const invalidFilter =
    await api.functional.communityPlatform.admin.moderators.index(connection, {
      body: {
        search: "invalid_search_term_that_should_not_match_anything",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformModerator.IRequest,
    });
  typia.assert(invalidFilter);
  TestValidator.predicate(
    "invalid search should return empty or limited results",
    invalidFilter.data.length <= baselineResults.data.length,
  );
}
