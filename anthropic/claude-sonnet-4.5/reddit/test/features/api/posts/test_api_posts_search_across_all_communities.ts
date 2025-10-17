import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test comprehensive post search and filtering across all public communities
 * without authentication.
 *
 * This test validates that guests can discover posts using text search on
 * titles, filter by post type (text, link, image), and sort using different
 * algorithms (hot, new, top, controversial). Verifies that pagination works
 * correctly and search results include proper post summaries.
 *
 * Test workflow:
 *
 * 1. Create member account for test data generation
 * 2. Create multiple public communities
 * 3. Create posts of different types (text, link, image) with varied content
 * 4. Test text search on post titles using guest connection
 * 5. Filter by post type
 * 6. Apply different sorting algorithms
 * 7. Validate pagination functionality
 * 8. Verify proper post summaries in results
 */
export async function test_api_posts_search_across_all_communities(
  connection: api.IConnection,
) {
  // Create member account for generating test data
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  // Create first public community
  const publicCommunity1 =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(publicCommunity1);

  // Create second public community
  const publicCommunity2 =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(publicCommunity2);

  // Create text post in first community
  const textPost1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: publicCommunity1.id,
        type: "text",
        title: "Discussion about TypeScript best practices",
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(textPost1);

  // Create link post in first community
  const linkPost1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: publicCommunity1.id,
        type: "link",
        title: "Interesting article about programming",
        url: "https://example.com/article",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(linkPost1);

  // Create image post in second community
  const imagePost1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: publicCommunity2.id,
        type: "image",
        title: "Beautiful TypeScript architecture diagram",
        image_url: "https://example.com/image.png",
        caption: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(imagePost1);

  // Create additional text post with different title
  const textPost2 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: publicCommunity2.id,
        type: "text",
        title: "Guide to modern JavaScript frameworks",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(textPost2);

  // Create unauthenticated connection for guest search
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Test 1: Search all posts without filters
  const allPostsResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(allPostsResult);
  TestValidator.predicate(
    "all posts result should contain data",
    allPostsResult.data.length > 0,
  );

  // Test 2: Text search on post titles
  const searchResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        search: "TypeScript",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(searchResult);

  // Test 3: Filter by post type - text
  const textPostsResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        type: "text",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(textPostsResult);

  // Test 4: Filter by post type - link
  const linkPostsResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        type: "link",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(linkPostsResult);

  // Test 5: Filter by post type - image
  const imagePostsResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        type: "image",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(imagePostsResult);

  // Test 6: Sort by 'new'
  const newSortResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        sort_by: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newSortResult);

  // Test 7: Sort by 'hot'
  const hotSortResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        sort_by: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotSortResult);

  // Test 8: Sort by 'top'
  const topSortResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        sort_by: "top",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topSortResult);

  // Test 9: Sort by 'controversial'
  const controversialSortResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        sort_by: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(controversialSortResult);

  // Test 10: Pagination - page 1
  const page1Result = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "pagination current page should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    page1Result.pagination.limit,
    5,
  );

  // Test 11: Pagination - page 2
  const page2Result = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination current page should be 2",
    page2Result.pagination.current,
    2,
  );

  // Test 12: Filter by specific community
  const communityFilterResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        community_id: publicCommunity1.id,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(communityFilterResult);

  // Test 13: Combined filters - type and search
  const combinedFilterResult = await api.functional.redditLike.posts.index(
    guestConnection,
    {
      body: {
        search: "programming",
        type: "link",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(combinedFilterResult);

  // Test 14: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have total records",
    allPostsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    allPostsResult.pagination.pages >= 0,
  );
}
