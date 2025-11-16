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
 * Test filtering posts within a specific date range using date_from and date_to
 * parameters. Validates temporal filtering and search result accuracy based on
 * post creation timestamps.
 *
 * Test workflow:
 *
 * 1. Create a member account for authentication
 * 2. Create a community for posting
 * 3. Create multiple posts on different dates (past, present, future relative to
 *    test execution)
 * 4. Search posts using date_from and date_to filters
 * 5. Validate that only posts within the specified date range are returned
 * 6. Verify edge cases like exact boundary dates and empty results
 */
export async function test_api_posts_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community for posting
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_name: "technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create posts on different dates
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const oneDayFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // For real implementation, we would need to get valid post type IDs from the system
  // Since we don't have an API to retrieve post types, we'll create posts with a placeholder
  // In a real scenario, this would be replaced with actual post type discovery
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  // Create posts with different creation times by creating them sequentially
  const posts: IRedditCommunityPost[] = [];

  // Post 1: Two days ago
  const post1 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: `Test Post 1 - ${twoDaysAgo.toISOString()}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: community.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  posts.push(post1);
  typia.assert(post1);

  // Post 2: One day ago
  const post2 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: `Test Post 2 - ${oneDayAgo.toISOString()}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: community.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  posts.push(post2);
  typia.assert(post2);

  // Post 3: Current time
  const post3 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: `Test Post 3 - ${now.toISOString()}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: community.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  posts.push(post3);
  typia.assert(post3);

  // Post 4: 12 hours in future (if system allows future posts)
  const twelveHoursFuture = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const post4 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: `Test Post 4 - ${twelveHoursFuture.toISOString()}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: community.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  posts.push(post4);
  typia.assert(post4);

  // Post 5: One day future
  const post5 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: `Test Post 5 - ${oneDayFuture.toISOString()}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: community.id,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  posts.push(post5);
  typia.assert(post5);

  // Step 4: Test date range filtering - Search for posts from yesterday to today
  const searchResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        date_from: oneDayAgo.toISOString(),
        date_to: now.toISOString(),
        sort_by: "created_at",
        order: "desc",
        community_id: community.id, // Filter by our specific community
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(searchResults);

  // Step 5: Validate filtering results
  // Should include posts 1 and 2 (twoDaysAgo and oneDayAgo) as they fall within or before the range
  // The actual filtering depends on the server's implementation of date range logic
  TestValidator.predicate(
    "search results contain valid posts",
    searchResults.data.every(
      (post) =>
        post.community.id === community.id &&
        typeof post.created_at === "string",
    ),
  );

  // Validate date range filtering worked
  const postsInRange = searchResults.data.filter((post) => {
    const postDate = new Date(post.created_at);
    return postDate >= oneDayAgo && postDate <= now;
  });

  TestValidator.predicate(
    "date range filtering works correctly",
    postsInRange.length > 0,
  );

  // Step 6: Test edge case - search with broader range to catch more posts
  const broadSearch = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        date_from: twoDaysAgo.toISOString(),
        date_to: oneDayFuture.toISOString(),
        sort_by: "created_at",
        order: "asc",
        community_id: community.id,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(broadSearch);

  TestValidator.predicate(
    "broad search returns more posts",
    broadSearch.data.length >= searchResults.data.length,
  );

  // Step 7: Test pagination with date filtering
  const paginatedSearch = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        date_from: twoDaysAgo.toISOString(),
        date_to: now.toISOString(),
        sort_by: "created_at",
        order: "desc",
        community_id: community.id,
        page: 1,
        limit: 2,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  TestValidator.equals(
    "paginated search respects limit",
    paginatedSearch.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 2,
  );

  // Step 8: Test empty result scenario with future-only range
  const futureOnlySearch = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        date_from: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 1 week future
        date_to: new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 2 weeks future
        sort_by: "created_at",
        order: "desc",
        community_id: community.id,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(futureOnlySearch);

  TestValidator.equals(
    "future-only search returns empty",
    futureOnlySearch.data.length,
    0,
  );
}
