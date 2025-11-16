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
 * Validate that admin post analytics endpoint correctly applies
 * createdAtFrom/createdAtTo date range filters, returning only posts created
 * within the specified window and exposing consistent pagination metadata.
 *
 * Business workflow:
 *
 * 1. Bootstrap authentication actors
 *
 *    - Register an adminUser via /auth/adminUser/join and keep its credentials
 *    - Register a memberUser via /auth/memberUser/join and keep its credentials
 * 2. As memberUser, create a community that will own all test posts
 * 3. As memberUser, create two groups of posts in that community
 *
 *    - "old" posts with created_at earlier than our reporting window
 *    - "recent" posts that will be included in the reporting window Since the API
 *         does not allow us to backdate created_at explicitly, we simulate
 *         temporal distance by:
 *
 *         - Creating the old posts first
 *         - Then waiting a small delay and creating the recent posts and finally using a
 *                   createdAtFrom value just after the oldest recent post's
 *                   creation timestamp so only recent posts fall into the
 *                   filter window.
 * 4. Switch to adminUser and call analytics endpoint with:
 *
 *    - CommunityId: the test community id
 *    - CreatedAtFrom: recentWindowStart
 *    - CreatedAtTo: null (no upper bound)
 *    - Page: 1, pageSize large enough for all test posts
 *    - SortBy/sortDirection: stable combination (e.g. "newest" + "desc")
 * 5. Validate analytics response:
 *
 *    - Typia.assert on the page wrapper
 *    - All data[i].community_id equals our community.id
 *    - All data[i].created_at is >= createdAtFrom filter value
 *    - No analytics record corresponds to an "old" post id
 *    - All recent post ids we created appear in the filtered result set
 * 6. Run an inverse query where createdAtTo is just before the recent posts to
 *    ensure only old posts are returned when using an upper bound (no recent
 *    post ids present and all old ids appear).
 */
export async function test_api_admin_post_analytics_date_range_filtering(
  connection: api.IConnection,
) {
  // Helper to sleep briefly so created_at timestamps can differ
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // -------------------------------------------------------------------------
  // 1. Bootstrap adminUser and memberUser actors
  // -------------------------------------------------------------------------
  const adminEmail: string = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword: string = "AdminPassw0rd!";

  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const memberEmail: string = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword: string = "MemberPassw0rd!";

  const memberJoinBody = {
    username: `member_${RandomGenerator.alphabets(6)}` as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: memberEmail as string & tags.Format<"email">,
    password: memberPassword as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // -------------------------------------------------------------------------
  // 2. As memberUser, create a community for test posts
  // -------------------------------------------------------------------------
  const communityCreateBody = {
    slug: `test-community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as
      | (string & tags.MaxLength<4000>)
      | null
      | undefined,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // -------------------------------------------------------------------------
  // 3. Create two groups of posts: old and recent
  // -------------------------------------------------------------------------
  const createPost = async (
    titleSuffix: string,
  ): Promise<ICommunityPlatformPost> => {
    const body = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Post ${titleSuffix} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body,
        },
      );
    typia.assert(post);
    return post;
  };

  const oldPosts: ICommunityPlatformPost[] = [];
  const recentPosts: ICommunityPlatformPost[] = [];

  const oldCount = 3;
  for (let i = 0; i < oldCount; i += 1) {
    const post = await createPost(`old-${i + 1}`);
    oldPosts.push(post);
  }

  await sleep(50);

  const recentCount = 4;
  for (let i = 0; i < recentCount; i += 1) {
    const post = await createPost(`recent-${i + 1}`);
    recentPosts.push(post);
  }

  await sleep(10);

  const recentCreatedTimes: string[] = recentPosts.map((p) => p.created_at);
  recentCreatedTimes.sort();
  const windowStart: string & tags.Format<"date-time"> =
    recentCreatedTimes[0] as string & tags.Format<"date-time">;

  const oldIds = oldPosts.map((p) => p.id);
  const recentIds = recentPosts.map((p) => p.id);

  // -------------------------------------------------------------------------
  // 4. Switch to adminUser and query analytics for recent window
  // -------------------------------------------------------------------------
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const analyticsRequestRecent = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id as string & tags.Format<"uuid">,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: windowStart,
    createdAtTo: null,
    minScore: null,
    maxScore: null,
    sortBy: "newest",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const analyticsPageRecent: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      { body: analyticsRequestRecent },
    );
  typia.assert(analyticsPageRecent);

  const paginationRecent = analyticsPageRecent.pagination;
  const dataRecent = analyticsPageRecent.data;

  TestValidator.equals(
    "analytics recent: page is first page",
    paginationRecent.current,
    1,
  );

  TestValidator.equals(
    "analytics recent: all records belong to the test community",
    true,
    dataRecent.every((row) => row.community_id === community.id),
  );

  TestValidator.equals(
    "analytics recent: all records are on or after windowStart",
    true,
    dataRecent.every((row) => row.created_at >= windowStart),
  );

  // Ensure that none of the explicitly old post ids appear in the recent window
  TestValidator.equals(
    "analytics recent: no old post id is included in analytics",
    true,
    dataRecent.every((row) => oldIds.includes(row.post_id) === false),
  );

  // Ensure that all recent posts we created are present in the recent window
  const recentIdsInAnalytics = dataRecent
    .filter((row) => recentIds.includes(row.post_id))
    .map((row) => row.post_id);

  TestValidator.equals(
    "analytics recent: all recent posts appear in analytics window",
    true,
    recentIds.every((id) => recentIdsInAnalytics.includes(id)),
  );

  // -------------------------------------------------------------------------
  // 6. Inverse window: target only old posts using createdAtTo
  // -------------------------------------------------------------------------
  const firstRecentCreatedAt = windowStart;

  const inverseWindowEndDate = new Date(firstRecentCreatedAt);
  inverseWindowEndDate.setMilliseconds(
    inverseWindowEndDate.getMilliseconds() - 1,
  );
  const createdAtToOldWindow: string & tags.Format<"date-time"> =
    inverseWindowEndDate.toISOString() as string & tags.Format<"date-time">;

  const analyticsRequestOldOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id as string & tags.Format<"uuid">,
    authorMemberUserId: null,
    status: null,
    createdAtFrom: null,
    createdAtTo: createdAtToOldWindow,
    minScore: null,
    maxScore: null,
    sortBy: "newest",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const analyticsPageOldOnly: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      { body: analyticsRequestOldOnly },
    );
  typia.assert(analyticsPageOldOnly);

  const paginationOld = analyticsPageOldOnly.pagination;
  const dataOld = analyticsPageOldOnly.data;

  TestValidator.equals(
    "analytics old: page is first page",
    paginationOld.current,
    1,
  );

  TestValidator.equals(
    "analytics old: all records belong to the test community",
    true,
    dataOld.every((row) => row.community_id === community.id),
  );

  TestValidator.equals(
    "analytics old: all records are on or before createdAtToOldWindow",
    true,
    dataOld.every((row) => row.created_at <= createdAtToOldWindow),
  );

  // Ensure that none of the explicitly recent post ids appear in the old window
  TestValidator.equals(
    "analytics old: no recent post id is included in analytics",
    true,
    dataOld.every((row) => recentIds.includes(row.post_id) === false),
  );

  // Ensure that all old posts we created are present in the old window
  const oldIdsInAnalytics = dataOld
    .filter((row) => oldIds.includes(row.post_id))
    .map((row) => row.post_id);

  TestValidator.equals(
    "analytics old: all old posts appear in analytics window",
    true,
    oldIds.every((id) => oldIdsInAnalytics.includes(id)),
  );
}
