import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test comment search with specific text filtering to validate content matching
 * functionality. Create multiple comments with varying content and verify that
 * the search operation correctly filters and returns only comments matching the
 * specified text query. Validate relevance scoring and proper handling of
 * partial matches and special characters in search queries.
 */
export async function test_api_post_comments_search_with_text_filter(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a post to host comments
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create multiple comments with varying content for search testing
  const comments: ICommunityPlatformComment[] = [];

  // Comment 1: Contains "technology" keyword
  const comment1 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "This is a great discussion about technology and innovation.",
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);
  comments.push(comment1);

  // Comment 2: Contains "programming" keyword
  const comment2 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "I love programming in TypeScript and building scalable applications.",
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);
  comments.push(comment2);

  // Comment 3: Contains "community" keyword
  const comment3 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "The community here is very supportive and helpful with technical questions.",
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment3);
  comments.push(comment3);

  // Comment 4: Contains partial match "tech"
  const comment4 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "Technical discussions are always interesting in this tech forum.",
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment4);
  comments.push(comment4);

  // Comment 5: Contains special characters and mixed case
  const comment5 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "TECHNOLOGY and programming! What's your favorite tech stack?",
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment5);
  comments.push(comment5);

  // 4. Test search functionality with text filtering

  // Test 1: Search for "technology" - should match comments 1 and 5
  const searchTechnology =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "technology",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchTechnology);

  TestValidator.equals(
    "search for 'technology' should return matching comments",
    searchTechnology.data.length,
    2,
  );

  TestValidator.predicate(
    "search results should contain comment with 'technology' keyword",
    searchTechnology.data.some((comment) =>
      comment.body.toLowerCase().includes("technology"),
    ),
  );

  // Test 2: Search for "programming" - should match comments 2 and 5
  const searchProgramming =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "programming",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchProgramming);

  TestValidator.equals(
    "search for 'programming' should return matching comments",
    searchProgramming.data.length,
    2,
  );

  // Test 3: Search for "community" - should match comment 3
  const searchCommunity =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "community",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchCommunity);

  TestValidator.equals(
    "search for 'community' should return matching comment",
    searchCommunity.data.length,
    1,
  );

  // Test 4: Search for partial match "tech" - should match comments 1, 4, and 5
  const searchTech =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "tech",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchTech);

  TestValidator.predicate(
    "partial search 'tech' should return multiple matches",
    searchTech.data.length >= 3,
  );

  // Test 5: Search with empty string - should return all published comments
  const searchEmpty =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchEmpty);

  TestValidator.equals(
    "empty search should return all published comments",
    searchEmpty.data.length,
    5,
  );

  // Test 6: Search for non-existent term - should return empty results
  const searchNonExistent =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "nonexistentterm12345",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchNonExistent);

  TestValidator.equals(
    "search for non-existent term should return empty results",
    searchNonExistent.data.length,
    0,
  );

  // Test 7: Validate pagination with search results
  const searchPagination =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        search: "tech",
        status: "published",
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchPagination);

  TestValidator.equals(
    "pagination should respect limit parameter",
    searchPagination.data.length,
    2,
  );

  TestValidator.predicate(
    "pagination metadata should be correctly set",
    searchPagination.pagination.limit === 2 &&
      searchPagination.pagination.current === 1,
  );
}
