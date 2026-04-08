import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_posts_community_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all posts to identify communities to filter by
  const allPosts = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: { limit: 100, page: 1 },
    },
  );
  typia.assert(allPosts);
  // Extract unique community IDs from existing posts using manual deduplication
  const communityIds: string[] = [];
  const seenCommunityIds = new Set<string>();
  for (const post of allPosts.data) {
    if (!seenCommunityIds.has(post.community.id)) {
      seenCommunityIds.add(post.community.id);
      communityIds.push(post.community.id);
    }
  }
  // Test with valid community ID if any exist
  if (communityIds.length === 0) {
    // No communities to test, validate empty response structure
    TestValidator.equals(
      "no communities response structure",
      allPosts.pagination,
      { current: 1, limit: 100, records: 0, pages: 0 },
    );
    return;
  }
  const testCommunityId = communityIds[0];
  // 2. Test community-specific filtering
  const communityFiltered = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: { communityId: testCommunityId, limit: 20, page: 1 },
    },
  );
  typia.assert(communityFiltered);
  // Verify all returned posts belong to the specified community
  communityFiltered.data.forEach((post) => {
    TestValidator.equals(
      `post ${post.id} belongs to filtered community`,
      post.community.id,
      testCommunityId,
    );
  });
  // Verify community name is correctly returned
  if (communityFiltered.data.length > 0) {
    const communityName = communityFiltered.data[0].community.name;
    TestValidator.predicate("community has name", communityName !== null);
  }
  // 3. Test post type filtering combined with community filter
  const textPostsInCommunity = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        communityId: testCommunityId,
        postType: "text",
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(textPostsInCommunity);
  // Verify all text posts belong to the community
  textPostsInCommunity.data.forEach((post) => {
    TestValidator.equals(
      `text post ${post.id} belongs to filtered community`,
      post.community.id,
      testCommunityId,
    );
    TestValidator.equals(`text post type is 'text'`, post.post_type, "text");
  });
  // 4. Test link posts within the community
  const linkPostsInCommunity = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        communityId: testCommunityId,
        postType: "link",
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(linkPostsInCommunity);
  linkPostsInCommunity.data.forEach((post) => {
    TestValidator.equals(
      `link post ${post.id} belongs to filtered community`,
      post.community.id,
      testCommunityId,
    );
    TestValidator.equals(`link post type is 'link'`, post.post_type, "link");
  });
  // 5. Test image posts within the community
  const imagePostsInCommunity =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        communityId: testCommunityId,
        postType: "image",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(imagePostsInCommunity);
  imagePostsInCommunity.data.forEach((post) => {
    TestValidator.equals(
      `image post ${post.id} belongs to filtered community`,
      post.community.id,
      testCommunityId,
    );
    TestValidator.equals(`image post type is 'image'`, post.post_type, "image");
  });
  // 6. Test sorting options within the community
  // Sort by new (chronological)
  const newSorted = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        communityId: testCommunityId,
        sort: "new",
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(newSorted);
  // Sort by hot (engagement-based)
  const hotSorted = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        communityId: testCommunityId,
        sort: "hot",
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(hotSorted);
  // Sort by top (vote score-based)
  const topSorted = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        communityId: testCommunityId,
        sort: "top",
        timePeriod: "all_time",
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(topSorted);
  // 7. Validate pagination for community-specific results
  const page1 = await api.functional.redditCommunity.posts.index(connection, {
    body: { communityId: testCommunityId, limit: 10, page: 1 },
  });
  typia.assert(page1);
  const page2 = await api.functional.redditCommunity.posts.index(connection, {
    body: { communityId: testCommunityId, limit: 10, page: 2 },
  });
  typia.assert(page2);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination page 1 current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 2 current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("pagination page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("pagination page 2 limit", page2.pagination.limit, 10);
  // 8. Verify author information in posts
  communityFiltered.data.forEach((post) => {
    // Verify author has username
    TestValidator.predicate(
      `post ${post.id} has author with username`,
      post.author.username !== undefined,
    );
  });
  // 9. Test date range filtering within community
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recentPostsInCommunity =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        communityId: testCommunityId,
        dateFrom: oneMonthAgo.toISOString(),
        limit: 20,
        page: 1,
      },
    });
  typia.assert(recentPostsInCommunity);
  // 10. Test that community filter excludes posts from other communities
  if (communityIds.length > 1) {
    const otherCommunityId = communityIds[1];
    // Filter by first community should not return posts from second community
    const postsFromFirst = await api.functional.redditCommunity.posts.index(
      connection,
      {
        body: { communityId: testCommunityId, limit: 100, page: 1 },
      },
    );
    typia.assert(postsFromFirst);
    // Verify no posts from other community are included
    const containsOtherCommunity = postsFromFirst.data.some(
      (post) => post.community.id === otherCommunityId,
    );
    TestValidator.predicate(
      "community filter excludes other communities",
      containsOtherCommunity === false,
    );
  }
}
