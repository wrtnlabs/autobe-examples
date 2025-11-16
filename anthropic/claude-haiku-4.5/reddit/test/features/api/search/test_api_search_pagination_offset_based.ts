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
 * Test offset-based pagination using page and limit parameters on search
 * endpoint.
 *
 * This test validates the core pagination mechanism of the search API by:
 *
 * 1. Creating test data (member, community, multiple posts) to enable pagination
 *    testing
 * 2. Performing searches with various page and limit combinations
 * 3. Verifying pagination metadata (current page, limit, total records, total
 *    pages)
 * 4. Confirming correct offset calculation: (page - 1) * limit
 * 5. Validating consistent result ordering across pages
 * 6. Testing edge cases and boundary conditions
 *
 * Steps:
 *
 * 1. Create a member account to authenticate
 * 2. Create a community for organizing posts
 * 3. Create 25+ posts in the community with searchable content
 * 4. Search with page=1, limit=10 and verify first 10 results
 * 5. Search with page=2, limit=10 and verify next 10 results
 * 6. Search with page=3, limit=10 and verify remaining results
 * 7. Search with limit=100 to test maximum limit
 * 8. Search beyond available results to verify empty response
 * 9. Validate pagination metadata consistency
 * 10. Verify result ordering consistency across pages
 */
export async function test_api_search_pagination_offset_based(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create 25 posts for pagination testing with consistent search term
  const searchKeyword = RandomGenerator.alphabets(8);
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    25,
    async () => {
      return await api.functional.communityPlatform.member.posts.create(
        connection,
        {
          body: {
            community_id: community.id,
            post_type: "text",
            title: `${searchKeyword} ${RandomGenerator.paragraph({ sentences: 3 })}`,
            content_text: RandomGenerator.content({ paragraphs: 2 }),
            is_nsfw: false,
            has_spoiler: false,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
  typia.assert(posts);
  TestValidator.predicate(
    "should create 25 posts for pagination testing",
    posts.length === 25,
  );

  // Step 4: Search with page=1, limit=10
  const page1Response: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 should have 10 results with limit=10",
    page1Response.data.length,
    10,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination total records should be at least 25",
    page1Response.pagination.records >= 25,
  );
  TestValidator.predicate(
    "pagination total pages should be 3 or more for 25+ posts",
    page1Response.pagination.pages >= 3,
  );

  // Step 5: Search with page=2, limit=10
  const page2Response: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 2,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have 10 results with limit=10",
    page2Response.data.length,
    10,
  );
  TestValidator.equals(
    "pagination current page should be 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "page 2 results should differ from page 1 results",
    page1Response.data[0].id,
    page2Response.data[0].id,
  );

  // Step 6: Search with page=3, limit=10
  const page3Response: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 3,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(page3Response);
  TestValidator.equals(
    "pagination current page should be 3",
    page3Response.pagination.current,
    3,
  );
  TestValidator.predicate(
    "page 3 should have results (up to 10)",
    page3Response.data.length > 0 && page3Response.data.length <= 10,
  );

  // Step 7: Search with limit=100 (maximum limit)
  const maxLimitResponse: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 100,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "pagination limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "response should contain all 25 created posts in single page with max limit",
    maxLimitResponse.data.length === 25,
  );
  TestValidator.equals(
    "total pages should be 1 when all results fit in single page",
    maxLimitResponse.pagination.pages,
    1,
  );

  // Step 8: Search beyond available results
  const beyondPageResponse: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 999,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "page beyond available results should return empty data",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page should reflect requested page",
    beyondPageResponse.pagination.current,
    999,
  );

  // Step 9: Validate pagination metadata consistency
  TestValidator.predicate(
    "total pages calculation should be consistent: ceil(records / limit)",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "offset calculation for page 2 should be (2-1) * 10 = 10",
    (page2Response.pagination.current - 1) * page2Response.pagination.limit ===
      10,
  );
  TestValidator.equals(
    "total records should be consistent across all page requests",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  TestValidator.equals(
    "total records should match max limit request",
    page1Response.pagination.records,
    maxLimitResponse.pagination.records,
  );
  TestValidator.equals(
    "total records should be 25 posts",
    page1Response.pagination.records,
    25,
  );

  // Step 10: Verify result ordering consistency
  TestValidator.predicate(
    "first result of page 1 should not appear on page 2",
    !page2Response.data.some((r) => r.id === page1Response.data[0].id),
  );
  TestValidator.predicate(
    "first result of page 2 should not appear on page 3",
    !page3Response.data.some((r) => r.id === page2Response.data[0].id),
  );
  TestValidator.predicate(
    "all page 1 results should not appear on page 2",
    !page2Response.data.some((r) =>
      page1Response.data.some((p1) => p1.id === r.id),
    ),
  );
}
