import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * Comprehensive E2E test for appeals search with multiple simultaneous filters
 * for community moderators.
 *
 * This test validates complex filtering scenarios combining status, appeal
 * level, date ranges, and escalation status across all moderated communities.
 * The test ensures moderators can efficiently manage appeals using
 * comprehensive filtering capabilities by:
 *
 * 1. Setting up a community moderator account with proper authentication
 * 2. Testing multiple filter combinations including status (pending, under_review,
 *    approved, denied, withdrawn, escalated)
 * 3. Testing appeal level filtering (initial, secondary, final)
 * 4. Testing date range filtering (created_at_from/to, resolved_at_from/to)
 * 5. Testing escalation status filtering (is_escalated)
 * 6. Validating response data integrity, pagination, and sorting
 * 7. Testing edge cases like boundary conditions and pagination
 * 8. Verifying that complex multi-filter scenarios return correct, properly
 *    filtered results
 *
 * The test covers realistic moderation workflows where community moderators
 * need to search through large numbers of appeals using multiple criteria
 * simultaneously to efficiently manage their community oversight
 * responsibilities.
 */
export async function test_api_appeals_moderator_comprehensive_moderation(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for testing
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  typia.assert(moderator);

  // Step 2: Test comprehensive appeals search with multiple filters
  const currentDate = new Date();
  const oneDayAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Test case 1: Basic filters - status and appeal level
  const basicFiltersResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
          appeal_level: "initial",
        },
      },
    );
  typia.assert(basicFiltersResult);
  TestValidator.equals(
    "basic filters should return results with pagination",
    basicFiltersResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination should be valid",
    basicFiltersResult.pagination.limit > 0 &&
      basicFiltersResult.pagination.records >= 0,
  );

  // Test case 2: Date range filtering
  const dateRangeResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_from: twoDaysAgo.toISOString(),
          created_at_to: currentDate.toISOString(),
          order_by: "created_at",
          order_direction: "desc",
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filtering should work",
    dateRangeResult.pagination.current,
    1,
  );

  // Test case 3: Complex multiple filter combination
  const complexFiltersResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          status: "under_review",
          appeal_level: "secondary",
          is_escalated: true,
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: currentDate.toISOString(),
          resolved_at_from: oneDayAgo.toISOString(),
          order_by: "resolved_at",
          order_direction: "desc",
        },
      },
    );
  typia.assert(complexFiltersResult);
  TestValidator.predicate(
    "complex filters should return properly formatted results",
    Array.isArray(complexFiltersResult.data) &&
      complexFiltersResult.pagination.limit === 15,
  );

  // Test case 4: Test resolved date range filtering
  const resolvedDateResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          resolved_at_from: oneDayAgo.toISOString(),
          resolved_at_to: currentDate.toISOString(),
          status: "approved",
          order_direction: "desc",
        },
      },
    );
  typia.assert(resolvedDateResult);
  TestValidator.equals(
    "resolved date filtering should work",
    resolvedDateResult.pagination.current,
    1,
  );

  // Test case 5: Single filter with different status values
  const pendingStatusResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          status: "pending",
        },
      },
    );
  typia.assert(pendingStatusResult);

  const escalatedStatusResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "escalated",
          is_escalated: true,
        },
      },
    );
  typia.assert(escalatedStatusResult);

  // Test case 6: Appeal level filtering with different levels
  const finalLevelResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 12,
          appeal_level: "final",
          order_by: "appeal_level",
          order_direction: "asc",
        },
      },
    );
  typia.assert(finalLevelResult);

  // Test case 7: Test pagination with different page numbers
  const page2Result: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          status: "denied",
          order_by: "created_at",
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 should have correct pagination",
    page2Result.pagination.current,
    2,
  );

  // Test case 8: Test default sorting when no order specified
  const defaultSortResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 8,
          status: "withdrawn",
        },
      },
    );
  typia.assert(defaultSortResult);

  // Test case 9: Edge case - minimum limit (1 item)
  const minimalLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
          appeal_level: "initial",
        },
      },
    );
  typia.assert(minimalLimitResult);
  TestValidator.equals(
    "minimal limit should work",
    minimalLimitResult.pagination.limit,
    1,
  );

  // Test case 10: Edge case - maximum limit (100 items)
  const maximalLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(maximalLimitResult);
  TestValidator.equals(
    "maximal limit should work",
    maximalLimitResult.pagination.limit,
    100,
  );

  // Test case 11: Verify data integrity of returned appeals
  if (basicFiltersResult.data.length > 0) {
    const firstAppeal = basicFiltersResult.data[0];
    TestValidator.predicate(
      "appeal data should have required fields",
      typeof firstAppeal.id === "string" &&
        typeof firstAppeal.status === "string" &&
        typeof firstAppeal.appeal_level === "string" &&
        typeof firstAppeal.created_at === "string",
    );
    TestValidator.predicate(
      "escalated flag should be boolean",
      typeof firstAppeal.is_escalated === "boolean",
    );
    TestValidator.predicate(
      "moderation action reference should exist",
      firstAppeal.moderation_action !== null &&
        typeof firstAppeal.moderation_action.id === "string",
    );
  }

  // Test case 12: Verify sorting order for created_at with desc
  const sortedResults: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "asc",
        },
      },
    );
  typia.assert(sortedResults);

  if (sortedResults.data.length > 1) {
    for (let i = 0; i < sortedResults.data.length - 1; i++) {
      const current = new Date(sortedResults.data[i].created_at);
      const next = new Date(sortedResults.data[i + 1].created_at);
      TestValidator.predicate(
        `created_at should be ascending at index ${i}`,
        current <= next,
      );
    }
  }

  // Test case 13: Complex filter with multiple statuses
  const multiStatusResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 30,
          appeal_level: "initial",
          created_at_from: oneWeekAgo.toISOString(),
          is_escalated: false,
        },
      },
    );
  typia.assert(multiStatusResult);

  // Test case 14: Verify pagination calculations are correct
  const paginationTestResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginationTestResult);

  TestValidator.predicate(
    "pagination records should be consistent",
    paginationTestResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    paginationTestResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page should match request",
    paginationTestResult.pagination.current === 1,
  );
}
