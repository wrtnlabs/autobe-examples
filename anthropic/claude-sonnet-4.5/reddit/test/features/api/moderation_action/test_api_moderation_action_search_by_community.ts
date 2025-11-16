import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test moderation action search API functionality within a community context.
 *
 * This test validates the moderation action search endpoint's ability to handle
 * various query parameters, pagination, sorting, and filtering options. Since
 * no APIs exist to create moderation actions, this test focuses on verifying
 * the search functionality works correctly regardless of whether actions
 * exist.
 *
 * Workflow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Create a community to establish search context
 * 3. Test basic search with default pagination
 * 4. Test various pagination parameters (page size, page number)
 * 5. Test sorting options (by created_at, action_type, moderator)
 * 6. Test filtering by moderator_id, action_type, target_type
 * 7. Test date range filtering (from_date, to_date)
 * 8. Test search query functionality
 * 9. Validate response structure and pagination metadata
 *
 * Validation points:
 *
 * - Verify response matches IPageIRedditCommunityModerationAction.ISummary schema
 * - Confirm pagination metadata is valid and consistent
 * - Ensure filtering parameters are accepted without errors
 * - Validate sorting parameters work correctly
 * - Check that results (if any) have proper summary structure
 */
export async function test_api_moderation_action_search_by_community(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(15);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Search all moderation actions with basic pagination
  const allActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActions);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    allActions.pagination.current >= 0 &&
      allActions.pagination.limit > 0 &&
      allActions.pagination.records >= 0 &&
      allActions.pagination.pages >= 0,
  );

  TestValidator.equals(
    "pagination current page",
    allActions.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit", allActions.pagination.limit, 20);

  // Step 5: Test pagination with different page sizes
  const smallPageResult =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page limit respected",
    smallPageResult.data.length <= 5,
  );
  TestValidator.equals(
    "small page limit in metadata",
    smallPageResult.pagination.limit,
    5,
  );

  // Step 6: Test pagination with large page size
  const largePageResult =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page limit in metadata",
    largePageResult.pagination.limit,
    100,
  );

  // Step 7: Test sorting by created_at descending
  const sortedByDateDesc =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);

  // Step 8: Test sorting by created_at ascending
  const sortedByDateAsc =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);

  // Step 9: Test sorting by action_type
  const sortedByActionType =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          sort_by: "action_type",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortedByActionType);

  // Step 10: Test sorting by moderator
  const sortedByModerator =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          sort_by: "moderator",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortedByModerator);

  // Step 11: Test filtering by moderator_id
  const moderatorActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          moderator_id: moderator.id,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(moderatorActions);

  // Step 12: Test filtering by action_type
  const removePostActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          action_type: "remove_post",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(removePostActions);

  // Step 13: Test filtering by target_type for posts
  const postTargetActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          target_type: "post",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(postTargetActions);

  // Step 14: Test filtering by target_type for comments
  const commentTargetActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          target_type: "comment",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(commentTargetActions);

  // Step 15: Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 30);
  const futureDate = new Date(now.getTime() + 86400000);

  const dateRangeResult =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          from_date: pastDate.toISOString(),
          to_date: futureDate.toISOString(),
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Step 16: Test search query filtering
  const searchResult =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          search_query: "test",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 17: Test combined filtering
  const combinedFilter =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          moderator_id: moderator.id,
          target_type: "post",
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // Step 18: Verify all action summaries have required fields (if any exist)
  if (allActions.data.length > 0) {
    TestValidator.predicate(
      "all action summaries have required fields",
      allActions.data.every(
        (action) =>
          action.id !== undefined &&
          action.reddit_community_moderator_id !== undefined &&
          action.action_type !== undefined &&
          action.target_entity_type !== undefined &&
          action.target_entity_id !== undefined &&
          action.created_at !== undefined,
      ),
    );
  }
}
