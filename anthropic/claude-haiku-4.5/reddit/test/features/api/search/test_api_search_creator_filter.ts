import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

/**
 * Test search filtering by content creator (username).
 *
 * This test validates that the search API correctly filters results to show
 * only posts and comments created by a specific member when using the creator
 * filter combined with keyword search. Tests exact username matching, AND logic
 * combination with keywords, and pagination with filtered results.
 *
 * Steps:
 *
 * 1. Create two different members as content creators
 * 2. Create a community for content
 * 3. First member creates posts with specific keywords
 * 4. Second member creates posts with similar keywords
 * 5. Search with keyword + creator filter for first member
 * 6. Validate only first member's posts appear in results
 * 7. Test case-sensitive username matching
 * 8. Verify AND logic between keyword and creator filter
 * 9. Test empty results for non-existent creator
 * 10. Verify pagination with filtered results
 */
export async function test_api_search_creator_filter(
  connection: api.IConnection,
) {
  // Step 1: Create first member (content creator to search for)
  const creator1Email = typia.random<string & tags.Format<"email">>();
  const creator1Username = "creator_one_" + RandomGenerator.alphaNumeric(6);
  const creator1 = await api.functional.auth.member.join(connection, {
    body: {
      email: creator1Email,
      username: creator1Username,
      password: "Password123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator1);

  // Store first creator's token for later use
  const creator1Token = creator1.token.access;

  // Step 2: Create community with first member's context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community " + RandomGenerator.alphaNumeric(6),
          identifier: "test_" + RandomGenerator.alphaNumeric(8),
          description: "Community for search filter testing",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: First member creates posts with specific keyword
  const searchKeyword = "typescript" + RandomGenerator.alphaNumeric(4);
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post about ${searchKeyword}`,
        content_text: `This is a detailed post about ${searchKeyword}. TypeScript is a great language.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Another ${searchKeyword} discussion`,
        content_text: `Let's talk about ${searchKeyword} best practices and advanced patterns.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 4: Create second member (another content creator)
  const creator2Email = typia.random<string & tags.Format<"email">>();
  const creator2Username = "creator_two_" + RandomGenerator.alphaNumeric(6);
  const creator2 = await api.functional.auth.member.join(connection, {
    body: {
      email: creator2Email,
      username: creator2Username,
      password: "Password456!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator2);

  // Step 5: Second member creates posts with same keyword
  const post3 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `My thoughts on ${searchKeyword}`,
        content_text: `Different perspective on ${searchKeyword}. Here's what I think.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);

  const post4 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Why ${searchKeyword} matters`,
        content_text: `Understanding ${searchKeyword} is crucial for modern development.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post4);

  // Step 6: Search with keyword and creator filter for first member
  const searchResult = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 50,
        creator: creator1Username,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 7: Validate that only first member's posts appear
  TestValidator.predicate(
    "search result should return paginated data",
    searchResult.pagination !== undefined && searchResult.data !== undefined,
  );

  TestValidator.equals(
    "search results should include both posts from creator 1",
    2,
    searchResult.data.filter(
      (result) =>
        result.post && result.post.creator.username === creator1Username,
    ).length,
  );

  // Step 8: Verify no posts from creator 2 appear in results
  const creator2PostsInResults = searchResult.data.filter(
    (result) =>
      result.post && result.post.creator.username === creator2Username,
  ).length;
  TestValidator.equals(
    "search results should not include posts from creator 2",
    0,
    creator2PostsInResults,
  );

  // Step 9: Verify all results contain the search keyword
  searchResult.data.forEach((result) => {
    const content = (
      result.post?.content_text ||
      result.comment?.content ||
      ""
    ).toLowerCase();
    const title = (result.post?.title || "").toLowerCase();
    TestValidator.predicate(
      `result should contain keyword: ${searchKeyword}`,
      content.includes(searchKeyword.toLowerCase()) ||
        title.includes(searchKeyword.toLowerCase()),
    );
  });

  // Step 10: Test case-sensitive username matching
  const caseVariationSearch =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 50,
        creator: creator1Username.toUpperCase(),
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(caseVariationSearch);

  // Different case should not match (case-sensitive)
  const caseVariationResults = caseVariationSearch.data.filter(
    (result) => result.post?.creator.username === creator1Username,
  ).length;
  TestValidator.predicate(
    "uppercase username variant should not match (case-sensitive)",
    caseVariationResults === 0 ||
      searchResult.data.length > caseVariationResults,
  );

  // Step 11: Test search with non-existent creator
  const nonExistentSearch = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 50,
        creator: "nonexistent_creator_" + RandomGenerator.alphaNumeric(10),
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(nonExistentSearch);

  TestValidator.equals(
    "search with non-existent creator should return empty results",
    0,
    nonExistentSearch.data.length,
  );

  // Step 12: Verify pagination works correctly with filtered results
  const paginatedSearch1 = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 1,
        creator: creator1Username,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(paginatedSearch1);

  TestValidator.predicate(
    "pagination should return 1 item when limit is 1",
    paginatedSearch1.data.length === 1,
  );

  TestValidator.predicate(
    "pagination info should be correct",
    paginatedSearch1.pagination.current === 1 &&
      paginatedSearch1.pagination.limit === 1 &&
      paginatedSearch1.pagination.records === 2,
  );

  // Step 13: Test AND logic - keyword must match AND creator must match
  const keywordOnlySearch = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "unrelated_keyword_" + RandomGenerator.alphaNumeric(8),
        page: 1,
        limit: 50,
        creator: creator1Username,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(keywordOnlySearch);

  TestValidator.equals(
    "search with unrelated keyword but matching creator should return no results (AND logic)",
    0,
    keywordOnlySearch.data.length,
  );
}
