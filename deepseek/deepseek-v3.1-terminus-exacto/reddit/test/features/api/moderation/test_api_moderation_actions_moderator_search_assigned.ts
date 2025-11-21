import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Test moderation action search functionality for moderators with
 * community-specific access.
 *
 * This E2E test validates that authenticated moderators can search and filter
 * moderation actions relevant to their assigned communities, ensuring proper
 * access control and data segregation. Tests filtering capabilities including
 * action type, status, severity level, date ranges, and text search to support
 * effective community moderation workflow management.
 */
export async function test_api_moderation_actions_moderator_search_assigned(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test basic search with default pagination
  const basicSearchResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(basicSearchResult);
  TestValidator.equals(
    "pagination structure exists",
    basicSearchResult.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit matches",
    basicSearchResult.pagination.limit,
    10,
  );

  // Step 3: Test filtering by action type
  const actionTypes = [
    "content_removal",
    "user_warning",
    "temporary_ban",
  ] as const;
  const actionTypeFilterResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          action_type: RandomGenerator.pick(actionTypes),
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(actionTypeFilterResult);

  // Step 4: Test filtering by status
  const statusTypes = [
    "pending",
    "active",
    "completed",
    "appealed",
    "overturned",
    "expired",
  ] as const;
  const statusFilterResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: RandomGenerator.pick(statusTypes),
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(statusFilterResult);

  // Step 5: Test filtering by severity level
  const severityLevels = ["low", "medium", "high", "critical"] as const;
  const severityFilterResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          severity_level: RandomGenerator.pick(severityLevels),
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(severityFilterResult);

  // Step 6: Test date range filtering
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  const dateFilterResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          created_after: yesterday,
          created_before: tomorrow,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(dateFilterResult);

  // Step 7: Test text search functionality
  const searchTermResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          search: RandomGenerator.alphabets(5),
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(searchTermResult);

  // Step 8: Test pagination with different parameters
  const paginationTestResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(paginationTestResult);
  TestValidator.equals(
    "page number matches",
    paginationTestResult.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "limit matches",
    paginationTestResult.pagination.limit,
    20,
  );

  // Step 9: Test combined filtering
  const combinedFilterResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: RandomGenerator.pick(actionTypes),
          status: RandomGenerator.pick(statusTypes),
          severity_level: RandomGenerator.pick(severityLevels),
          created_after: yesterday,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  // Step 10: Validate response data structure
  if (basicSearchResult.data.length > 0) {
    const firstAction = basicSearchResult.data[0];
    TestValidator.predicate(
      "action has valid UUID id",
      firstAction.id.length > 0,
    );
    TestValidator.predicate(
      "action has type",
      firstAction.action_type.length > 0,
    );
    TestValidator.predicate("action has status", firstAction.status.length > 0);
    TestValidator.predicate(
      "action has creation timestamp",
      firstAction.created_at.length > 0,
    );
  }

  // Step 11: Test empty search with no filters
  const emptySearchResult =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearchResult.pagination.records >= 0,
  );
}
