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
 * Test text search functionality within moderation action reason fields.
 *
 * Validates that moderators can search for specific content patterns or
 * keywords within moderation reasons to identify related actions or analyze
 * moderation rationale. Tests combined filtering with action type and severity
 * level to support comprehensive moderation content analysis and pattern
 * recognition.
 */
export async function test_api_moderation_actions_moderator_search_by_reason_text(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator (required dependency)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test basic text search functionality
  const searchResults =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "spam",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns valid pagination info",
    searchResults.pagination.current === 1 &&
      searchResults.pagination.limit === 10,
  );

  // Step 3: Test combined filtering with action type and search
  const combinedSearch =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          action_type: "content_removal",
          search: "inappropriate",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Step 4: Test search with severity level filtering
  const severitySearch =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          severity_level: "high",
          search: "violation",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(severitySearch);

  // Step 5: Test empty search term (should return all results)
  const emptySearch =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(emptySearch);

  // Step 6: Test partial word matching
  const partialSearch =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          search: "harass",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(partialSearch);

  // Step 7: Validate pagination works correctly with search results
  TestValidator.predicate(
    "pagination properties are valid",
    searchResults.pagination.current >= 0 &&
      searchResults.pagination.limit > 0 &&
      searchResults.pagination.records >= 0 &&
      searchResults.pagination.pages >= 0,
  );

  // Step 8: Test date range filtering combined with search
  const dateSearch =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          search: "misinformation",
          created_after: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 7 days
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(dateSearch);
}
