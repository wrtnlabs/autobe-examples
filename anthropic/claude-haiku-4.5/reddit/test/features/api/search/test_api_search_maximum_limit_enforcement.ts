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
 * Test that search respects maximum limit constraint of 100 results per page.
 *
 * This test validates that the search API properly enforces the maximum limit
 * of 100 results per request. The API returns at most 100 results regardless of
 * how many records exist in the database. This constraint prevents performance
 * issues and ensures consistent API behavior across all clients.
 *
 * Test Flow:
 *
 * 1. Authenticate and create a member account
 * 2. Create a community for organizing test posts
 * 3. Create 120+ searchable posts to exceed the maximum limit
 * 4. Search with limit=100 (maximum allowed) on page 1 and verify exactly 100
 *    results
 * 5. Validate pagination metadata correctly reflects the applied limit
 * 6. Search with limit=100 on page 2 to verify pagination consistency
 * 7. Confirm results never exceed the maximum limit of 100
 */
export async function test_api_search_maximum_limit_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create 120+ posts to exceed the maximum limit
  const postCount = 120;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async () => {
      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.member.posts.create(connection, {
          body: {
            community_id: community.id,
            post_type: "text",
            title: `Test Post ${RandomGenerator.alphaNumeric(4)}`,
            content_text: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformPost.ICreate,
        });
      return post;
    },
  );
  typia.assert(createdPosts);
  TestValidator.predicate(
    "created sufficient posts for testing",
    createdPosts.length >= 120,
  );

  // Step 4: Search with limit=100 (maximum allowed) on page 1
  const searchQuery = "post";
  const page1Result: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchQuery,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(page1Result);

  // Step 5: Validate pagination metadata for page 1
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 100",
    page1Result.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "results count does not exceed limit",
    page1Result.data.length <= 100,
  );
  TestValidator.equals(
    "actual results match pagination limit",
    page1Result.data.length,
    page1Result.pagination.limit,
  );

  // Step 6: Verify search results are valid
  TestValidator.predicate(
    "search returns results",
    page1Result.data.length > 0,
  );
  TestValidator.predicate(
    "all results are valid search entries",
    page1Result.data.every(
      (result) =>
        result.id &&
        (result.content_type === "post" || result.content_type === "comment") &&
        result.preview_text &&
        result.community,
    ),
  );

  // Step 7: Verify pagination metadata is consistent
  TestValidator.predicate(
    "total records count is valid",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculation is valid",
    page1Result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length does not exceed limit",
    page1Result.data.length <= page1Result.pagination.limit,
  );

  // Step 8: Search with limit=100 on page 2 to verify pagination consistency
  if (page1Result.pagination.pages > 1) {
    const page2Result: IPageICommunityPlatformSearchResult =
      await api.functional.communityPlatform.search.index(connection, {
        body: {
          q: searchQuery,
          page: 2,
          limit: 100,
        } satisfies ICommunityPlatformSearchIndex.IRequest,
      });
    typia.assert(page2Result);

    TestValidator.equals(
      "page 2 pagination current is 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit is also 100",
      page2Result.pagination.limit,
      100,
    );
    TestValidator.predicate(
      "page 2 results do not exceed limit",
      page2Result.data.length <= 100,
    );
  }

  // Step 9: Confirm maximum limit constraint is enforced
  TestValidator.predicate(
    "maximum limit of 100 is enforced on page 1",
    page1Result.pagination.limit <= 100,
  );
  TestValidator.equals(
    "limit is exactly 100",
    page1Result.pagination.limit,
    100,
  );
}
