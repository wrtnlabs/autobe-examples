import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test filtering moderation actions by specific moderator to review individual
 * moderator performance and activity patterns.
 *
 * This scenario validates the ability to track and analyze actions taken by a
 * particular moderator for accountability, performance review, and moderation
 * quality assessment. It ensures that the moderator_id filter correctly returns
 * only actions performed by the specified moderator.
 *
 * Workflow:
 *
 * 1. Create primary moderator account
 * 2. Create secondary moderator account
 * 3. Primary moderator creates a community
 * 4. Create member accounts and content (posts) in the community
 * 5. Search moderation actions filtered by primary moderator's ID
 * 6. Verify that only actions by the primary moderator are returned (if any exist)
 * 7. Verify moderator_id filter works correctly with pagination
 *
 * Validation points:
 *
 * - The moderator_id filter correctly filters actions by the specified moderator
 * - Response structure matches IPageIRedditCommunityModerationAction.ISummary
 * - Pagination metadata is correct
 * - If actions exist, each has the correct reddit_community_moderator_id
 */
export async function test_api_moderation_action_search_by_moderator_activity(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account
  const primaryModeratorEmail = typia.random<string & tags.Format<"email">>();
  const primaryModeratorPassword = "SecurePass123!";
  const primaryModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: primaryModeratorEmail,
        password: primaryModeratorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(primaryModerator);

  // Step 2: Create secondary moderator account
  const secondaryModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondaryModeratorPassword = "SecurePass456!";
  const secondaryModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondaryModeratorEmail,
        password: secondaryModeratorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(secondaryModerator);

  // Step 3: Primary moderator creates a community (already authenticated from join)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: primaryModeratorEmail,
      password: primaryModeratorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          rules: RandomGenerator.paragraph({ sentences: 1 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create member account and some posts in the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: null,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });

  // Create a few posts in the community as member
  const postCount = 3;
  await ArrayUtil.asyncRepeat(postCount, async (index) => {
    const post: IRedditCommunityPost =
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      });
    typia.assert(post);
  });

  // Step 5: Search moderation actions filtered by primary moderator's ID
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: primaryModeratorEmail,
      password: primaryModeratorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const searchRequest = {
    page: 1,
    limit: 10,
    moderator_id: primaryModerator.id,
    community_id: community.id,
    action_type: null,
    target_type: null,
    from_date: null,
    to_date: null,
    sort_by: "created_at",
    order: "desc",
    search_query: null,
  } satisfies IRedditCommunityModerationAction.IRequest;

  const moderationActionsPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest,
      },
    );
  typia.assert(moderationActionsPage);

  // Step 6: Validate response structure and filtering
  TestValidator.predicate(
    "pagination object should exist",
    moderationActionsPage.pagination !== null &&
      moderationActionsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(moderationActionsPage.data),
  );

  // Validate pagination metadata
  const pagination: IPage.IPagination = moderationActionsPage.pagination;
  typia.assert(pagination);
  TestValidator.equals("current page should be 1", pagination.current, 0);
  TestValidator.equals(
    "limit should match request",
    pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    pagination.pages >= 0,
  );

  // If there are any moderation actions, validate they all belong to the primary moderator
  if (moderationActionsPage.data.length > 0) {
    moderationActionsPage.data.forEach((action, index) => {
      typia.assert(action);
      TestValidator.equals(
        `action ${index} should belong to primary moderator`,
        action.reddit_community_moderator_id,
        primaryModerator.id,
      );
    });
  }

  // Step 7: Test pagination with different page sizes
  const paginationTest = {
    page: 1,
    limit: 5,
    moderator_id: primaryModerator.id,
    community_id: community.id,
    action_type: null,
    target_type: null,
    from_date: null,
    to_date: null,
    sort_by: "created_at",
    order: "desc",
    search_query: null,
  } satisfies IRedditCommunityModerationAction.IRequest;

  const paginatedResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: paginationTest,
      },
    );
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit should match request",
    paginatedResult.pagination.limit,
    paginationTest.limit,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginatedResult.data.length <= paginationTest.limit,
  );

  // Test filtering by non-existent moderator ID
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  const emptySearchRequest = {
    page: 1,
    limit: 10,
    moderator_id: nonExistentModeratorId,
    community_id: community.id,
    action_type: null,
    target_type: null,
    from_date: null,
    to_date: null,
    sort_by: "created_at",
    order: "desc",
    search_query: null,
  } satisfies IRedditCommunityModerationAction.IRequest;

  const emptyResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: community.name,
        body: emptySearchRequest,
      },
    );
  typia.assert(emptyResult);

  TestValidator.equals(
    "filtering by non-existent moderator should return zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtering by non-existent moderator should return empty data array",
    emptyResult.data.length,
    0,
  );
}
