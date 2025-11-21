import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test comprehensive post search functionality with community filtering.
 *
 * This test validates that users can search and filter posts across the
 * platform with advanced criteria including community-specific filtering. The
 * test creates a member account, establishes a community, creates multiple
 * posts within that community, and then performs search operations to verify
 * filtering by community ID works correctly. The scenario validates pagination,
 * search relevance, and proper handling of community-scoped content discovery.
 */
export async function test_api_post_search_with_community_filter(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community for post context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create multiple posts within the community
  const postTitles = ArrayUtil.repeat(3, (index) =>
    RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  );

  const createdPosts: ICommunityPlatformPost[] = [];
  for (const title of postTitles) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: title,
          post_type: "text",
          status: "published",
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // 4. Test search with community filtering
  const searchResults = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        community_id: community.id,
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(searchResults);

  // 5. Validate search results
  TestValidator.equals(
    "search results should contain created posts",
    searchResults.data.length,
    createdPosts.length,
  );

  TestValidator.predicate(
    "all search results should belong to the filtered community",
    searchResults.data.every((post) => post.community.id === community.id),
  );

  TestValidator.equals(
    "pagination should show correct total records",
    searchResults.pagination.records,
    createdPosts.length,
  );

  // 6. Test search with non-existent community (should return empty)
  const emptySearchResults = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptySearchResults);

  TestValidator.equals(
    "search with non-existent community should return empty results",
    emptySearchResults.data.length,
    0,
  );

  // 7. Test search without community filter (should return posts from all communities)
  const allPostsSearch = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(allPostsSearch);

  TestValidator.predicate(
    "search without community filter should return posts",
    allPostsSearch.data.length >= createdPosts.length,
  );
}
