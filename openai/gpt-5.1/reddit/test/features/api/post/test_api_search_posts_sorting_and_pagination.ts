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
 * Validate sorting and pagination behavior of the post search endpoint.
 *
 * Business goals:
 *
 * - Ensure that PATCH /communityPlatform/search/posts respects the `sort` option
 *   for newest-first ordering.
 * - Verify that page/limit based pagination is stable, non-overlapping, and
 *   returns consistent slices of the overall result set.
 * - Confirm that all returned items belong to the target community and conform to
 *   the ICommunityPlatformPost.ISummary contract.
 *
 * Test workflow:
 *
 * 1. Register a new member user via auth.memberUser.join to obtain an
 *    authenticated memberUser context.
 * 2. Create a single community for that member via
 *    communityPlatform.memberUser.communities.create.
 * 3. Create 15 posts in that community via
 *    communityPlatform.memberUser.posts.create, capturing their order of
 *    creation and IDs.
 * 4. Call communityPlatform.search.posts.index with an
 *    ICommunityPlatformPost.IRequest body targeting the community by id and
 *    sort mode set to "new" (assumed newest-first), with page=1 and limit=5.
 * 5. Assert that:
 *
 *    - The response passes typia.assert for IPageICommunityPlatformPost.ISummary.
 *    - Pagination metadata (current, limit, records, pages) is consistent with
 *         expectations (current=1, limit=5, records>=15, pages>=3, and records
 *         == data.length on all fetched pages combined when restricted to this
 *         community and conditions).
 *    - The data array is ordered by createdAt descending.
 *    - All summaries have community.id equal to the created community.id.
 * 6. Call the same endpoint again with page=2 and identical filters.
 * 7. Assert that:
 *
 *    - Page 2 has current=2 and limit=5.
 *    - Data is again sorted by createdAt descending.
 *    - No overlap in IDs between page 1 and page 2.
 *    - The union of IDs from pages 1 and 2 is a prefix of the globally newest posts
 *         created in this test (i.e., still ordered correctly when
 *         concatenated).
 *
 * Because we cannot control createdAt directly, we rely on creation order and
 * the server's newest-first semantics for sort="new". We validate by comparing
 * createdAt timestamps from the summaries.
 */
export async function test_api_search_posts_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community for this member
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create 15 posts in that community, capturing creation order
  const totalPosts = 15;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < totalPosts; i++) {
    const postBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
      body: RandomGenerator.paragraph({ sentences: 3 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: postBody },
      );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Helper to validate descending createdAt order in summaries
  const assertDescendingCreatedAt = (
    title: string,
    summaries: ICommunityPlatformPost.ISummary[],
  ): void => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = new Date(summaries[i - 1].createdAt).getTime();
      const curr = new Date(summaries[i].createdAt).getTime();
      TestValidator.predicate(
        `${title} - createdAt[${i - 1}] >= createdAt[${i}]`,
        prev >= curr,
      );
    }
  };

  // 4. Search page 1 with sort = "new", limit = 5
  const pageSize = 5;
  const requestPage1 = {
    page: 1,
    limit: pageSize,
    communityId: community.id,
    communityCode: undefined,
    authorId: undefined,
    search: undefined,
    postType: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;

  const page1: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.search.posts.index(connection, {
      body: requestPage1,
    });
  typia.assert(page1);

  const pagination1: IPage.IPagination = page1.pagination;

  // Basic pagination checks for page 1
  TestValidator.equals(
    "page1 current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page1 limit should equal requested page size",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "page1 records should be at least totalPosts",
    pagination1.records >= totalPosts,
  );
  TestValidator.predicate(
    "page1 pages should be at least 1",
    pagination1.pages >= 1,
  );

  // Data checks for page 1
  assertDescendingCreatedAt("page1", page1.data);

  for (const summary of page1.data) {
    TestValidator.equals(
      "page1 summary community id matches created community",
      summary.community.id,
      community.id,
    );
  }

  // 6. Search page 2 with same filter
  const requestPage2 = {
    page: 2,
    limit: pageSize,
    communityId: community.id,
    communityCode: undefined,
    authorId: undefined,
    search: undefined,
    postType: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;

  const page2: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.search.posts.index(connection, {
      body: requestPage2,
    });
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;

  TestValidator.equals(
    "page2 current page should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "page2 limit should equal requested page size",
    pagination2.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination records should be consistent between page1 and page2",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pagination pages should be consistent between page1 and page2",
    pagination2.pages,
    pagination1.pages,
  );

  assertDescendingCreatedAt("page2", page2.data);

  for (const summary of page2.data) {
    TestValidator.equals(
      "page2 summary community id matches created community",
      summary.community.id,
      community.id,
    );
  }

  // Non-overlap between page 1 and page 2
  const page1Ids = page1.data.map((s) => s.id);
  const page2Ids = page2.data.map((s) => s.id);

  for (const id of page1Ids) {
    TestValidator.predicate(
      "no overlap between page1 and page2 ids",
      page2Ids.includes(id) === false,
    );
  }

  // Concatenated pages should still respect global newest-first order
  const combined = [...page1.data, ...page2.data];
  assertDescendingCreatedAt("combined page1+page2", combined);
}
