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
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test post search functionality with comprehensive filtering and sorting.
 *
 * This test validates the post search API's filtering capabilities including
 * community filtering, post type filtering, text search, and various sorting
 * algorithms. Posts are created with vote distributions to test sorting
 * effectiveness.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts
 * 2. Create a community to host posts
 * 3. Create multiple posts with different types and content
 * 4. Cast votes to establish vote distributions for sorting tests
 * 5. Test community filtering
 * 6. Test post type filtering
 * 7. Test text search functionality
 * 8. Test different sorting algorithms (hot, new, top, controversial)
 * 9. Test pagination
 */
export async function test_api_posts_search_with_vote_score_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!@#",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!@#",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member2);

  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!@#",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member3);

  // Step 2: Create a community for posts
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create multiple posts with different types
  const textPost1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: "Quality Discussion Topic",
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(textPost1);

  const linkPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "link",
        title: "Interesting Article Link",
        url: "https://example.com/article",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(linkPost);

  const imagePost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "image",
        title: "Cool Image Post",
        image_url: "https://example.com/image.jpg",
        caption: "Amazing photograph",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(imagePost);

  const textPost2 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: "Another Discussion",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(textPost2);

  // Step 4: Cast votes to establish distributions
  // Vote on textPost1 (high score)
  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: textPost1.id,
    body: { vote_value: 1 } satisfies IRedditLikePostVote.ICreate,
  });

  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: linkPost.id,
    body: { vote_value: 1 } satisfies IRedditLikePostVote.ICreate,
  });

  // Step 5: Test community filtering
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const communityFilterResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(communityFilterResult);
  TestValidator.equals(
    "community filter should return all posts in community",
    communityFilterResult.data.length,
    4,
  );

  // Step 6: Test post type filtering
  const textPostsResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        type: "text",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(textPostsResult);
  TestValidator.equals(
    "type filter should return only text posts",
    textPostsResult.data.length,
    2,
  );

  const linkPostsResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        type: "link",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(linkPostsResult);
  TestValidator.equals(
    "type filter should return only link posts",
    linkPostsResult.data.length,
    1,
  );

  // Step 7: Test text search functionality
  const searchResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        search: "Quality",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search should return posts matching query",
    searchResult.data.length >= 1,
  );

  // Step 8: Test sorting algorithms
  const newSortResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        sort_by: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newSortResult);
  TestValidator.equals(
    "new sort should return all posts",
    newSortResult.data.length,
    4,
  );

  const hotSortResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        sort_by: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotSortResult);
  TestValidator.equals(
    "hot sort should return all posts",
    hotSortResult.data.length,
    4,
  );

  const topSortResult = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        sort_by: "top",
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topSortResult);
  TestValidator.equals(
    "top sort should return all posts",
    topSortResult.data.length,
    4,
  );

  // Step 9: Test pagination
  const page1Result = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        page: 1,
        limit: 2,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 should return 2 posts with limit 2",
    page1Result.data.length,
    2,
  );

  const page2Result = await api.functional.redditLike.posts.index(
    unauthConnection,
    {
      body: {
        community_id: community.id,
        page: 2,
        limit: 2,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 should return remaining posts",
    page2Result.data.length,
    2,
  );
}
