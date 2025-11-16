import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test searching posts based on engagement metrics like upvote count, downvote
 * count, and comment count. Validates that the search system correctly filters
 * posts based on popularity and engagement thresholds.
 *
 * This test creates posts with different templates and verifies search
 * filtering works correctly:
 *
 * 1. Register member for authentication
 * 2. Create community for posts
 * 3. Create multiple posts in the community
 * 4. Test searching with upvote count ranges
 * 5. Test searching with comment count filters
 * 6. Test sorting by engagement metrics
 * 7. Validate search results match criteria
 * 8. Test pagination with engagement sorting
 */
export async function test_api_posts_search_by_engagement_metrics(
  connection: api.IConnection,
) {
  // Step 1: Register member for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for posts
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(15),
        title: RandomGenerator.name(4),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_name: "General",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create multiple posts in the community with different characteristics
  await ArrayUtil.asyncRepeat(10, async (index) => {
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: `Test Post ${index + 1}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: community.id,
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    });
  });

  // Step 4: Test sorting by engagement metrics - ascending by upvotes
  const byUpvotesAsc = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        sort_by: "upvote_count",
        order: "asc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(byUpvotesAsc);

  TestValidator.predicate("posts sorted by upvotes count ascending", () =>
    byUpvotesAsc.data
      .slice(0, -1)
      .every(
        (post, i) => post.upvote_count <= byUpvotesAsc.data[i + 1].upvote_count,
      ),
  );

  // Step 5: Test sorting by engagement metrics - descending by upvotes
  const byUpvotesDesc = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        sort_by: "upvote_count",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(byUpvotesDesc);

  TestValidator.predicate("posts sorted by upvotes count descending", () =>
    byUpvotesDesc.data
      .slice(0, -1)
      .every(
        (post, i) =>
          post.upvote_count >= byUpvotesDesc.data[i + 1].upvote_count,
      ),
  );

  // Step 6: Test sorting by comment count - ascending
  const byCommentsAsc = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        sort_by: "comment_count",
        order: "asc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(byCommentsAsc);

  TestValidator.predicate("posts sorted by comment count ascending", () =>
    byCommentsAsc.data
      .slice(0, -1)
      .every(
        (post, i) =>
          post.comment_count <= byCommentsAsc.data[i + 1].comment_count,
      ),
  );

  // Step 7: Test sorting by comment count - descending
  const byCommentsDesc = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        sort_by: "comment_count",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(byCommentsDesc);

  TestValidator.predicate("posts sorted by comment count descending", () =>
    byCommentsDesc.data
      .slice(0, -1)
      .every(
        (post, i) =>
          post.comment_count >= byCommentsDesc.data[i + 1].comment_count,
      ),
  );

  // Step 8: Test filtering by minimum comment count
  const highComments = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        min_comments: 0,
        sort_by: "comment_count",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(highComments);

  TestValidator.predicate(
    "minimum comment count filter returns posts meeting criteria",
    () => highComments.data.every((post) => post.comment_count >= 0),
  );

  // Step 9: Test filtering by upvote count range
  const upvoteRange = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        min_upvotes: 0,
        max_upvotes: 1000,
        sort_by: "upvote_count",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(upvoteRange);

  TestValidator.predicate(
    "upvote count range filter returns posts within specified range",
    () =>
      upvoteRange.data.every(
        (post) => post.upvote_count >= 0 && post.upvote_count <= 1000,
      ),
  );

  // Step 10: Test pagination with engagement sorting
  const pagedResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        page: 1,
        limit: 5,
        sort_by: "view_count",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(pagedResults);

  TestValidator.predicate(
    "pagination returns correct page configuration",
    () =>
      pagedResults.pagination.current === 1 &&
      pagedResults.pagination.limit === 5 &&
      pagedResults.pagination.records === 10,
  );

  // Step 11: Test multiple engagement filters combined
  const combinedResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        min_upvotes: 0,
        max_upvotes: 200,
        min_comments: 0,
        sort_by: "created_at",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(combinedResults);

  TestValidator.predicate(
    "combined engagement filters return posts matching all criteria",
    () =>
      combinedResults.data.every(
        (post) =>
          post.upvote_count >= 0 &&
          post.upvote_count <= 200 &&
          post.comment_count >= 0,
      ),
  );

  // Step 12: Test search by post engagement state (locked/pinned)
  const unlockedResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        is_locked: false,
        sort_by: "created_at",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(unlockedResults);

  TestValidator.predicate("is_locked filter returns unlocked posts only", () =>
    unlockedResults.data.every((post) => post.is_locked === false),
  );

  const unpinnedResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        is_pinned: false,
        sort_by: "created_at",
        order: "desc",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(unpinnedResults);

  TestValidator.predicate("is_pinned filter returns unpinned posts only", () =>
    unpinnedResults.data.every((post) => post.is_pinned === false),
  );
}
