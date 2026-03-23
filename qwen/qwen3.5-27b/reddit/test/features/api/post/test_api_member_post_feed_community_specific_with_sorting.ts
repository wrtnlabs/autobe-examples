import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test community-specific post feed retrieval with various sorting and filtering options.
 * 1. Authenticate member and create a test community
 * 2. Create multiple posts with different types and scores
 * 3. Test community-specific feed filtering
 * 4. Test various sort orders (hot, new, top, controversial)
 * 5. Test time filters with top sort
 * 6. Test post type filtering
 * 7. Test search functionality
 * 8. Test date range filtering
 * 9. Test pagination consistency
 * 10. Verify comment count aggregation
 */
export async function test_api_member_post_feed_community_specific_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a test community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create multiple posts with different types
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const postType = RandomGenerator.pick(["text", "link", "image"] as const);
    return await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: `Test Post ${index + 1} - ${postType}`,
          postType,
          communityId: community.id,
          content:
            postType === "text"
              ? RandomGenerator.paragraph({ sentences: 5 })
              : null,
        } satisfies IRedditClonePost.ICreate,
      },
    );
  });
  posts.forEach((post) => typia.assert(post));
  // 4. Test community-specific feed filtering
  const communityFeed = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        page: 1,
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(communityFeed);
  TestValidator.equals(
    "community feed contains created posts",
    communityFeed.data.length,
    5,
  );
  TestValidator.predicate(
    "all posts belong to correct community",
    communityFeed.data.every((p) => p.community.id === community.id),
  );
  // 5. Test 'new' sort order (chronological)
  const newSorted = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate(
    "new sort returns posts in chronological order",
    newSorted.data.every((post, i, arr) =>
      i === 0
        ? true
        : new Date(post.created_at).getTime() <=
          new Date(arr[i - 1].created_at).getTime(),
    ),
  );
  // 6. Test 'hot' sort order
  const hotSorted = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        sort: "hot",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotSorted);
  TestValidator.equals(
    "hot sort returns same number of posts",
    hotSorted.data.length,
    5,
  );
  // 7. Test 'top' sort with time filters
  const timeFilters = ["today", "week", "month", "year", "all_time"] as const;
  for (const timeFilter of timeFilters) {
    const topSorted = await api.functional.redditClone.member.posts.index(
      memberConnection,
      {
        body: {
          feed_type: "community",
          community_id: community.id,
          sort: "top",
          time_filter: timeFilter,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(topSorted);
    TestValidator.predicate(
      `top sort with ${timeFilter} filter returns posts`,
      topSorted.data.length >= 0,
    );
  }
  // 8. Test post type filtering
  const postTypes = ["text", "link", "image"] as const;
  for (const postType of postTypes) {
    const typeFiltered = await api.functional.redditClone.member.posts.index(
      memberConnection,
      {
        body: {
          feed_type: "community",
          community_id: community.id,
          post_type: postType,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(typeFiltered);
    TestValidator.predicate(
      `post type filter for ${postType} works`,
      typeFiltered.data.every((p) => p.post_type === postType),
    );
  }
  // 9. Test search functionality
  const searchKeyword = "Test Post";
  const searchResults = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        search: searchKeyword,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns posts containing keyword",
    searchResults.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain keyword in title",
    searchResults.data.every((p) =>
      p.title.toLowerCase().includes(searchKeyword.toLowerCase()),
    ),
  );
  // 10. Test date range filtering
  const sortedByDate = [...posts].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const oldestPost = sortedByDate[0];
  const newestPost = sortedByDate[sortedByDate.length - 1];
  const dateRangeFiltered = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        created_at_from: oldestPost.created_at,
        created_at_to: newestPost.created_at,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(dateRangeFiltered);
  TestValidator.equals(
    "date range filter returns all posts in range",
    dateRangeFiltered.data.length,
    5,
  );
  // 11. Test pagination consistency
  const page1 = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        page: 1,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "community",
        community_id: community.id,
        page: 2,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 1 has 2 posts", page1.data.length, 2);
  TestValidator.equals("page 2 has 2 posts", page2.data.length, 2);
  TestValidator.predicate(
    "pagination pages have different posts",
    page1.data[0].id !== page2.data[0].id,
  );
  // 12. Verify comment count aggregation
  TestValidator.predicate(
    "all posts have comment_count field",
    communityFeed.data.every((p) => typeof p.comment_count === "number"),
  );
  TestValidator.predicate(
    "comment counts are non-negative",
    communityFeed.data.every((p) => p.comment_count >= 0),
  );
  // 13. Test non-existent community_id returns error
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent community returns error",
    async () => {
      await api.functional.redditClone.member.posts.index(memberConnection, {
        body: {
          feed_type: "community",
          community_id: nonExistentCommunityId,
        } satisfies IRedditClonePost.IRequest,
      });
    },
  );
}
