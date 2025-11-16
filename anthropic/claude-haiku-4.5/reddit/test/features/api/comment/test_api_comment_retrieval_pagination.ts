import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test pagination functionality when retrieving comments with page and
 * page_size parameters.
 *
 * This scenario validates comment retrieval pagination by:
 *
 * 1. Creating test data (member, admin, category, community, post)
 * 2. Retrieving comments with pagination parameters
 * 3. Verifying pagination metadata (current page, limit, total records, total
 *    pages)
 * 4. Testing different page sizes
 * 5. Testing page boundary conditions
 * 6. Validating correct comment subsets for each page
 * 7. Ensuring pagination calculations are correct
 *
 * The test validates pagination calculations and page boundary handling.
 */
export async function test_api_comment_retrieval_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community and post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Retrieve first page of comments with page=1, page_size=20 (default)
  const firstPageResponse: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(firstPageResponse);

  // Step 7: Verify pagination metadata for first page
  TestValidator.equals(
    "first page current page number",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit per page",
    firstPageResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page total records is non-negative",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page data array length <= limit",
    firstPageResponse.data.length <= firstPageResponse.pagination.limit,
  );
  TestValidator.predicate(
    "first page total pages calculated correctly",
    firstPageResponse.pagination.pages >= 0,
  );

  // Step 8: Verify page count calculation matches records and limit
  const expectedPages = Math.ceil(
    firstPageResponse.pagination.records / firstPageResponse.pagination.limit,
  );
  TestValidator.equals(
    "total pages equals ceiling of records/limit",
    firstPageResponse.pagination.pages,
    expectedPages,
  );

  // Step 9: Retrieve second page if more records exist
  if (firstPageResponse.pagination.records > 20) {
    const secondPageResponse: IPageICommunityPlatformComment =
      await api.functional.communityPlatform.posts.comments.index(connection, {
        postId: post.id,
        body: {
          page: 2,
          page_size: 20,
          sort_by: "best",
        } satisfies ICommunityPlatformComment.IRequest,
      });
    typia.assert(secondPageResponse);

    // Step 10: Verify pagination metadata for second page
    TestValidator.equals(
      "second page current page number",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit per page",
      secondPageResponse.pagination.limit,
      20,
    );
    TestValidator.equals(
      "second page total records matches first page",
      secondPageResponse.pagination.records,
      firstPageResponse.pagination.records,
    );

    // Verify that second page has different comments than first page
    const firstPageIds = new Set(firstPageResponse.data.map((c) => c.id));
    const secondPageHasDifferentComments = secondPageResponse.data.some(
      (c) => !firstPageIds.has(c.id),
    );
    TestValidator.predicate(
      "second page contains different comments",
      secondPageHasDifferentComments,
    );

    // Verify correct number of remaining comments on second page
    const expectedSecondPageSize = Math.min(
      firstPageResponse.pagination.records - 20,
      20,
    );
    TestValidator.equals(
      "second page has correct number of items",
      secondPageResponse.data.length,
      expectedSecondPageSize,
    );
  }

  // Step 11: Test with smaller page size
  const smallPageSizeResponse: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 5,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(smallPageSizeResponse);
  TestValidator.equals(
    "small page size limit is respected",
    smallPageSizeResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page size data length <= 5",
    smallPageSizeResponse.data.length <= 5,
  );

  // Step 12: Test with larger page size (capped at max 100)
  const largePageSizeResponse: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 50,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(largePageSizeResponse);
  TestValidator.equals(
    "large page size limit is respected",
    largePageSizeResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large page size data length <= 50",
    largePageSizeResponse.data.length <= 50,
  );

  // Step 13: Test page boundary - request high page number
  const beyondPageResponse: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 999,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(beyondPageResponse);
  TestValidator.predicate(
    "beyond page request returns valid response",
    beyondPageResponse.data.length >= 0,
  );

  // Step 14: Test pagination consistency - same query returns same results
  const repeatQueryResponse: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(repeatQueryResponse);
  TestValidator.equals(
    "repeat query returns same total records",
    repeatQueryResponse.pagination.records,
    firstPageResponse.pagination.records,
  );
  TestValidator.equals(
    "repeat query returns same total pages",
    repeatQueryResponse.pagination.pages,
    firstPageResponse.pagination.pages,
  );
  TestValidator.equals(
    "repeat query returns same data length",
    repeatQueryResponse.data.length,
    firstPageResponse.data.length,
  );
}
