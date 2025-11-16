import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate pagination boundaries and metadata for community post listing.
 *
 * This test ensures that the generic post listing endpoint (PATCH
 * /communityPlatform/posts) correctly handles standard page/limit pagination
 * when constrained to a single community scope.
 *
 * The scenario:
 *
 * 1. Register a new member user (auth.memberUser.join) to obtain an authenticated
 *    memberUser actor and token.
 * 2. Under that memberUser, create a single community using
 *    communityPlatform.memberUser.communities.create with
 *    ICommunityPlatformCommunity.ICreate.
 * 3. Seed exactly N=23 posts in that community by repeatedly calling
 *    communityPlatform.memberUser.posts.create with
 *    ICommunityPlatformPost.ICreate, ensuring all posts target the same
 *    community and have distinguishable titles/bodies.
 * 4. Exercise PATCH /communityPlatform/posts with ICommunityPlatformPost.IRequest
 *    using page/limit parameters and a community filter, and verify pagination
 *    metadata and page content sizes:
 *
 *    - Page=1, limit=10: expect 10 items, pagination.current=1, pagination.limit=10,
 *         pagination.records=23, pagination.pages=3.
 *    - Page=2, limit=10: expect 10 items, pagination.current=2, same records/pages.
 *    - Page=3, limit=10: expect 3 items (remainder), pagination.current=3.
 * 5. Validate ordering semantics assuming default sort is newest-first (e.g., by
 *    createdAt descending):
 *
 *    - Page 1 should contain the last 10 created posts.
 *    - Page 2 should contain the previous 10 posts.
 *    - Page 3 should contain the earliest 3 posts. This is validated by comparing
 *         the ordered IDs returned from the listing endpoint against the
 *         locally captured ordered list of created post IDs.
 * 6. Call PATCH /communityPlatform/posts with page beyond the last page (page=4,
 *    limit=10) and confirm that pagination.current=4 and data.length===0,
 *    ensuring that out-of-range pages are handled in a safe and consistent
 *    manner rather than erroring.
 *
 * Business validation focus:
 *
 * - Pagination metadata (current, limit, records, pages) correctly reflects the
 *   underlying number of posts.
 * - Page navigation produces non-overlapping windows that cover all posts exactly
 *   once.
 * - Requests for out-of-range pages do not cause errors and return an empty data
 *   set with consistent pagination metadata.
 */
export async function test_api_post_list_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain authenticated context
  const joinInput = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert(member);

  // 2. Create a single community under this member user
  const communityCreate = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 3. Seed exactly N=23 posts in that community
  const TOTAL_POSTS = 23;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < TOTAL_POSTS; i++) {
    const createPostBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Post ${i + 1} in ${community.slug}`,
      body: RandomGenerator.paragraph({ sentences: 4 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      {
        body: createPostBody,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Helper to sort posts in expected newest-first order using created_at
  const expectedNewestFirst: ICommunityPlatformPost[] = [...createdPosts].sort(
    (a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // Convenience helper to call index with page/limit and community filters
  const fetchPage = async (page: number, limit: number) => {
    const requestBody = {
      page,
      limit,
      communityId: community.id,
      communityCode: community.slug,
    } satisfies ICommunityPlatformPost.IRequest;

    const pageResult: IPageICommunityPlatformPost.ISummary =
      await api.functional.communityPlatform.posts.index(connection, {
        body: requestBody,
      });
    typia.assert(pageResult);
    return pageResult;
  };

  // Expect pagination metadata
  const expectedLimit = 10;
  const expectedRecords = TOTAL_POSTS;
  const expectedPages = 3;

  // 4-A. Page 1
  const page1 = await fetchPage(1, expectedLimit);
  const pagination1 = page1.pagination;

  TestValidator.equals("page1: current page", pagination1.current, 1);
  TestValidator.equals("page1: limit", pagination1.limit, expectedLimit);
  TestValidator.equals(
    "page1: total records",
    pagination1.records,
    expectedRecords,
  );
  TestValidator.equals("page1: total pages", pagination1.pages, expectedPages);
  TestValidator.equals("page1: data length", page1.data.length, expectedLimit);

  const expectedPage1 = expectedNewestFirst.slice(0, expectedLimit);
  const expectedPage1Ids = expectedPage1.map((p) => p.id);
  const actualPage1Ids = page1.data.map((s) => s.id);
  TestValidator.equals(
    "page1: ordering of ids",
    actualPage1Ids,
    expectedPage1Ids,
  );

  // 4-B. Page 2
  const page2 = await fetchPage(2, expectedLimit);
  const pagination2 = page2.pagination;

  TestValidator.equals("page2: current page", pagination2.current, 2);
  TestValidator.equals("page2: limit", pagination2.limit, expectedLimit);
  TestValidator.equals(
    "page2: total records",
    pagination2.records,
    expectedRecords,
  );
  TestValidator.equals("page2: total pages", pagination2.pages, expectedPages);
  TestValidator.equals("page2: data length", page2.data.length, expectedLimit);

  const expectedPage2 = expectedNewestFirst.slice(
    expectedLimit,
    expectedLimit * 2,
  );
  const expectedPage2Ids = expectedPage2.map((p) => p.id);
  const actualPage2Ids = page2.data.map((s) => s.id);
  TestValidator.equals(
    "page2: ordering of ids",
    actualPage2Ids,
    expectedPage2Ids,
  );

  // 4-C. Page 3
  const page3 = await fetchPage(3, expectedLimit);
  const pagination3 = page3.pagination;

  TestValidator.equals("page3: current page", pagination3.current, 3);
  TestValidator.equals("page3: limit", pagination3.limit, expectedLimit);
  TestValidator.equals(
    "page3: total records",
    pagination3.records,
    expectedRecords,
  );
  TestValidator.equals("page3: total pages", pagination3.pages, expectedPages);
  TestValidator.equals(
    "page3: data length",
    page3.data.length,
    TOTAL_POSTS - 2 * expectedLimit,
  );

  const expectedPage3 = expectedNewestFirst.slice(expectedLimit * 2);
  const expectedPage3Ids = expectedPage3.map((p) => p.id);
  const actualPage3Ids = page3.data.map((s) => s.id);
  TestValidator.equals(
    "page3: ordering of ids",
    actualPage3Ids,
    expectedPage3Ids,
  );

  // 5. Out-of-range page (page 4)
  const page4 = await fetchPage(4, expectedLimit);
  const pagination4 = page4.pagination;

  TestValidator.equals("page4: current page", pagination4.current, 4);
  TestValidator.equals("page4: limit", pagination4.limit, expectedLimit);
  TestValidator.equals(
    "page4: total records",
    pagination4.records,
    expectedRecords,
  );
  TestValidator.equals("page4: total pages", pagination4.pages, expectedPages);
  TestValidator.equals("page4: data length should be 0", page4.data.length, 0);
}
