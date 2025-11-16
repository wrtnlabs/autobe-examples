import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAnalytics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostAnalytics";

/**
 * Validate admin post analytics pagination behavior for a specific community.
 *
 * Business context
 *
 * - Admin users inspect post analytics across communities using a paginated
 *   analytics endpoint. When a community has many posts, the analytics endpoint
 *   must paginate consistently so that page indices and pageSize parameters
 *   slice the result set without overlaps.
 * - This test focuses on verifying that, for a single community with more than
 *   one page of posts, two consecutive pages return disjoint sets of analytics
 *   rows and that requesting a far-out page yields an empty data array with
 *   coherent pagination metadata.
 *
 * High-level steps
 *
 * 1. Register an adminUser account and implicitly authenticate it.
 * 2. Register a memberUser account and implicitly authenticate it.
 * 3. As memberUser, create a community.
 * 4. As memberUser, create 30 posts inside that community.
 * 5. Switch context to adminUser (login) to access analytics.
 * 6. Call the post analytics endpoint for page 1 with pageSize 10, filtered by the
 *    created community, with deterministic sortBy/sortDirection.
 * 7. Call the same analytics endpoint for page 2 (pageSize 10) with the same
 *    filter and sorting.
 * 8. Assert that:
 *
 *    - Pagination.current and pagination.limit in each response reflect the
 *         requested values.
 *    - The sets of post_ids in page 1 and page 2 are disjoint.
 *    - All analytics rows in both pages belong to the created community.
 * 9. Call the analytics endpoint with a large out-of-range page index (page=999)
 *    for the same filter and verify that:
 *
 *    - Data is empty.
 *    - Pagination.current echoes 999.
 *    - Pagination.limit echoes the requested pageSize.
 */
export async function test_api_admin_post_analytics_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies Format<"password"> by being non-empty and complex
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, create 30 posts in this community
  const targetPostCount = 30;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    targetPostCount,
    async (index) => {
      const createPostBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: `Post ${index + 1} in community ${community.slug}`,
        body: RandomGenerator.paragraph({ sentences: 8 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          {
            body: createPostBody,
          },
        );
      typia.assert(post);
      return post;
    },
  );

  TestValidator.equals(
    "created post count should match targetPostCount",
    createdPosts.length,
    targetPostCount,
  );

  // 5. Switch context back to adminUser using login (explicit actor switch)
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/analytics",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Common analytics request parameters
  const pageSize = 10;
  const sortBy = "created_at";
  const sortDirection = "desc";

  // 6. Analytics page 1
  const analyticsRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: null,
    minScore: null,
    maxScore: null,
    sortBy,
    sortDirection,
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const analyticsPage1: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      {
        body: analyticsRequestPage1,
      },
    );
  typia.assert(analyticsPage1);

  // 7. Analytics page 2
  const analyticsRequestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: null,
    minScore: null,
    maxScore: null,
    sortBy,
    sortDirection,
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const analyticsPage2: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      {
        body: analyticsRequestPage2,
      },
    );
  typia.assert(analyticsPage2);

  // Basic pagination metadata checks for page 1 & 2
  TestValidator.equals(
    "page1 pagination.current should be 1",
    analyticsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 pagination.limit should equal requested pageSize",
    analyticsPage1.pagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "page2 pagination.current should be 2",
    analyticsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 pagination.limit should equal requested pageSize",
    analyticsPage2.pagination.limit,
    pageSize,
  );

  // Collect post_ids and community_ids from page1 and page2
  const page1PostIds = analyticsPage1.data.map((row) => row.post_id);
  const page2PostIds = analyticsPage2.data.map((row) => row.post_id);

  // Ensure all rows belong to the created community
  await TestValidator.predicate(
    "all analytics rows in page1 belong to created community",
    async () =>
      analyticsPage1.data.every((row) => row.community_id === community.id),
  );

  await TestValidator.predicate(
    "all analytics rows in page2 belong to created community",
    async () =>
      analyticsPage2.data.every((row) => row.community_id === community.id),
  );

  // Check that there is no overlap between post_ids of page1 and page2
  const page1Set = new Set(page1PostIds);
  const page2Set = new Set(page2PostIds);
  const overlap = [...page1Set].filter((id) => page2Set.has(id));

  TestValidator.equals(
    "no overlapping post_ids between page1 and page2",
    overlap.length,
    0,
  );

  // 8. Request an out-of-range page (e.g., page=999)
  const outOfRangePage = 999;
  const analyticsRequestOutOfRange = {
    page: outOfRangePage as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: null,
    minScore: null,
    maxScore: null,
    sortBy,
    sortDirection,
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const analyticsOutOfRange: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      {
        body: analyticsRequestOutOfRange,
      },
    );
  typia.assert(analyticsOutOfRange);

  TestValidator.equals(
    "out-of-range page should echo requested current page",
    analyticsOutOfRange.pagination.current,
    outOfRangePage,
  );

  TestValidator.equals(
    "out-of-range page should echo requested pageSize as limit",
    analyticsOutOfRange.pagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "out-of-range page should have empty data array",
    analyticsOutOfRange.data.length,
    0,
  );

  // Sanity checks on total records and pages
  await TestValidator.predicate(
    "total records should be non-negative",
    async () => analyticsOutOfRange.pagination.records >= 0,
  );

  await TestValidator.predicate(
    "total pages should be non-negative",
    async () => analyticsOutOfRange.pagination.pages >= 0,
  );
}
