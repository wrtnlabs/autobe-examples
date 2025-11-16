import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test pagination edge cases and boundaries for post search functionality.
 *
 * This test validates the post search API's pagination system by creating
 * sufficient test data and verifying pagination works correctly across various
 * page numbers, limit values, and boundary conditions. Tests include first
 * page, middle pages, last page, and beyond-last-page requests. Validates that
 * pagination metadata accurately reflects available result set and that offset
 * calculations are correct without skipping or duplicating results.
 *
 * The test workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create test category for community classification
 * 3. Create member account for community and post creation
 * 4. Create community to host posts
 * 5. Create multiple posts (25) to enable comprehensive pagination testing
 * 6. Test pagination with various page numbers and limit values
 * 7. Verify pagination metadata accuracy
 * 8. Test boundary conditions (first page, last page, beyond last page)
 * 9. Verify no result duplication or skipping across pages
 */
export async function test_api_posts_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // Setup: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "TestAdmin@123456",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminResponse);

  // Create test category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category " + RandomGenerator.alphaNumeric(5),
          slug: "test-category-" + RandomGenerator.alphaNumeric(8),
          description: "Category for pagination testing",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestMember@123456",
      username: RandomGenerator.alphaNumeric(10),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResponse);

  // Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Pagination Test Community",
          identifier: "pagination-test-" + RandomGenerator.alphaNumeric(6),
          description: "Community for pagination boundary testing",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create 25 posts to enable comprehensive pagination testing
  const createdPosts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 25; i++) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Test Post ${i + 1}`,
          content_text: RandomGenerator.content({ paragraphs: 2 }),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Test 1: First page with small limit (5 items)
  const page1 = await api.functional.communityPlatform.posts.index(connection, {
    body: {
      page: 1,
      limit: 5,
      community_id: community.id,
      visibility_status: "public",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 records total", page1.pagination.records, 25);
  TestValidator.equals("page 1 pages calculated", page1.pagination.pages, 5);
  TestValidator.equals("page 1 data length", page1.data.length, 5);

  // Test 2: Second page with same limit
  const page2 = await api.functional.communityPlatform.posts.index(connection, {
    body: {
      page: 2,
      limit: 5,
      community_id: community.id,
      visibility_status: "public",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 records", page2.pagination.records, 25);
  TestValidator.equals("page 2 pages", page2.pagination.pages, 5);
  TestValidator.equals("page 2 data length", page2.data.length, 5);

  // Verify no duplicate IDs between page 1 and page 2
  const page1Ids = page1.data.map((p) => p.id);
  const page2Ids = page2.data.map((p) => p.id);
  for (const id of page2Ids) {
    TestValidator.predicate(
      `page 2 should not duplicate page 1 post ${id}`,
      !page1Ids.includes(id),
    );
  }

  // Test 3: Middle page (page 3)
  const page3 = await api.functional.communityPlatform.posts.index(connection, {
    body: {
      page: 3,
      limit: 5,
      community_id: community.id,
      visibility_status: "public",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(page3);
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 data length", page3.data.length, 5);

  // Verify page 3 has no duplicates from page 1 and 2
  const page3Ids = page3.data.map((p) => p.id);
  const allPreviousIds = [...page1Ids, ...page2Ids];
  for (const id of page3Ids) {
    TestValidator.predicate(
      `page 3 should not duplicate previous pages for ${id}`,
      !allPreviousIds.includes(id),
    );
  }

  // Test 4: Last page (page 5)
  const page5 = await api.functional.communityPlatform.posts.index(connection, {
    body: {
      page: 5,
      limit: 5,
      community_id: community.id,
      visibility_status: "public",
    } satisfies ICommunityPlatformPost.IRequest,
  });
  typia.assert(page5);
  TestValidator.equals("page 5 current page", page5.pagination.current, 5);
  TestValidator.equals("page 5 data length", page5.data.length, 5);

  // Test 5: Beyond last page (page 10)
  const pageBeyond = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 10,
        limit: 5,
        community_id: community.id,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "beyond last page should return empty",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "beyond last page records",
    pageBeyond.pagination.records,
    25,
  );
  TestValidator.equals(
    "beyond last page pages",
    pageBeyond.pagination.pages,
    5,
  );

  // Test 6: Test maximum limit constraint (100 items)
  const maxLimitPage = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit request", maxLimitPage.pagination.limit, 100);
  TestValidator.equals(
    "max limit returns all available",
    maxLimitPage.data.length,
    25,
  );

  // Test 7: Different limit value (10 items)
  const page1Limit10 = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        community_id: community.id,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "limit 10 current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals("limit 10 limit", page1Limit10.pagination.limit, 10);
  TestValidator.equals("limit 10 pages", page1Limit10.pagination.pages, 3);
  TestValidator.equals("limit 10 data length", page1Limit10.data.length, 10);

  // Test 8: Verify pagination metadata calculation: pages = ceil(records / limit)
  const testLimits = [1, 3, 7, 25];
  for (const limit of testLimits) {
    const result = await api.functional.communityPlatform.posts.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit,
          community_id: community.id,
          visibility_status: "public",
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(result);
    const expectedPages = Math.ceil(25 / limit);
    TestValidator.equals(
      `pagination pages for limit ${limit}`,
      result.pagination.pages,
      expectedPages,
    );
  }

  // Test 9: Verify consistency across multiple requests to same page
  const page1Again = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        community_id: community.id,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page1Again);
  TestValidator.equals(
    "page 1 consistency check",
    page1Again.data.length,
    page1.data.length,
  );
  TestValidator.equals(
    "page 1 same IDs",
    page1.data.map((p) => p.id).join(","),
    page1Again.data.map((p) => p.id).join(","),
  );

  // Test 10: Collect all posts across all pages and verify completeness
  const allCollectedIds: string[] = [];
  for (let pageNum = 1; pageNum <= 5; pageNum++) {
    const pageResult = await api.functional.communityPlatform.posts.index(
      connection,
      {
        body: {
          page: pageNum,
          limit: 5,
          community_id: community.id,
          visibility_status: "public",
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(pageResult);
    allCollectedIds.push(...pageResult.data.map((p) => p.id));
  }

  TestValidator.equals(
    "total posts collected from pagination",
    allCollectedIds.length,
    25,
  );
  TestValidator.equals(
    "no duplicate post IDs across pages",
    new Set(allCollectedIds).size,
    25,
  );
}
