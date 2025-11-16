import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAnalytics";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentAnalytics";

/**
 * Validate admin comment analytics filters by status and created_at window.
 *
 * Business goal
 *
 * - Ensure that the admin analytics endpoint for comments
 *   (/communityPlatform/adminUser/analytics/comments) correctly applies:
 *
 *   - Created_from / created_to time-window filters
 *   - Status filters
 *   - Pagination (page, limit) and sorting (sort_by, sort_direction).
 *
 * Scenario steps
 *
 * 1. Register an adminUser via auth.adminUser.join and keep credentials.
 * 2. Register a memberUser via auth.memberUser.join and keep credentials.
 * 3. Authenticate as memberUser (login) to get a valid member session.
 * 4. Create a community with a unique slug via
 *    communityPlatform.memberUser.communities.create.
 * 5. Create a membership for that community using
 *    communityPlatform.memberUser.communities.memberships.create.
 * 6. Create a post in the community via communityPlatform.memberUser.posts.create.
 * 7. Create multiple comments on that post via
 *    communityPlatform.memberUser.posts.comments.create:
 *
 *    - At least 5 comments total.
 *    - We will treat the first 3 as "older" and the last 2 as "recent" for the
 *         purposes of time-based filtering.
 *    - We capture each comment's created_at timestamp from the response.
 * 8. Switch to adminUser context by logging in with auth.adminUser.login.
 * 9. Build a narrow created_at window that only includes the last 2 comments:
 *
 *    - Created_from = (min created_at among the last 2 comments)
 *    - Created_to = (max created_at among the last 2 comments) plus a small margin
 *         if needed.
 * 10. Call analytics endpoint with:
 *
 *     - Status undefined at first (so that all statuses are included).
 *     - Created_from/created_to from step 9.
 *     - Sort_by = "last_activity_at", sort_direction = "desc".
 *     - Page = 1, limit = a number >= total comments we created (e.g., 20).
 * 11. Validate analytics result for narrow window:
 *
 *     - Typia.assert() on the response type.
 *     - Extract all records where comment_id matches any of our created comments.
 *     - For those records, ensure that comment_id belongs only to the last 2 comments
 *           according to our partition (no analytics rows for the first 3 older
 *           comments should fall within the narrow window).
 *     - Check that returned analytics for our recent comments are ordered by
 *           last_activity_at (or created_at when last_activity_at is undefined)
 *           in descending order.
 * 12. Build a broader window that includes all 5 comments:
 *
 *     - Created_from = min created_at of all 5 comments.
 *     - Created_to = max created_at of all 5 comments, or null to mean open-ended.
 * 13. Optionally determine a status value for filtering:
 *
 *     - If the narrow-window query returned at least one analytics row for our
 *           comments, capture its status string from a subsequent analytics
 *           call that supports status; since
 *           ICommunityPlatformCommentAnalytics.ISummary does not expose status,
 *           we cannot derive it, so we restrict ourselves to time-window based
 *           tests for reliability.
 * 14. Call analytics endpoint again with the broad window:
 *
 *     - Created_from/created_to covering all comments.
 *     - Status left undefined to include all statuses.
 *     - Page = 1, limit = 50 (or any number >= 5).
 * 15. Validate analytics for broad window:
 *
 *     - Typia.assert() on the response.
 *     - Among analytics.data, ensure that there is at least one record for each of
 *           our 5 comment IDs.
 *     - Verify pagination fields are coherent with the number of analytics rows.
 */
export async function test_api_admin_comment_analytics_status_and_time_filters(
  connection: api.IConnection,
) {
  // Helper to make a non-auth connection when needed (but we won't touch headers directly later).
  // const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // matches password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginId = adminJoinBody.email;
  const adminLoginPw = adminJoinBody.password;

  // 2. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginId = memberJoinBody.email;
  const memberLoginPw = memberJoinBody.password;

  // 3. Log in as memberUser to ensure member session is active
  const memberLoginBody = {
    identifier: memberLoginId,
    password: memberLoginPw,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 4. Create a community
  const communitySlug = `test-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    communitySlug,
  );

  // 5. Create membership for the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community slug matches",
    membership.community.slug,
    communitySlug,
  );

  // 6. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id matches",
    post.community_id,
    community.id,
  );

  // 7. Create multiple comments on the post
  const totalComments = 5;
  const comments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < totalComments; i++) {
    const commentCreateBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentCreateBody,
        },
      );
    typia.assert(comment);

    comments.push(comment);
  }

  TestValidator.equals("created comment count", comments.length, totalComments);

  // Partition into older (first 3) and recent (last 2)
  const olderComments = comments.slice(0, 3);
  const recentComments = comments.slice(3);

  const allCreatedAt = comments.map((c) => c.created_at);
  const recentCreatedAt = recentComments.map((c) => c.created_at);

  // Compute min/max created_at for recent and all
  const minRecent = recentCreatedAt.reduce((a, b) => (a < b ? a : b));
  const maxRecent = recentCreatedAt.reduce((a, b) => (a > b ? a : b));

  const minAll = allCreatedAt.reduce((a, b) => (a < b ? a : b));
  const maxAll = allCreatedAt.reduce((a, b) => (a > b ? a : b));

  // 8. Switch to adminUser context by logging in
  const adminLoginBody = {
    identifier: adminLoginId,
    password: adminLoginPw,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 9-10. Narrow analytics query focusing on recent comments only
  const pageLimitNarrow = 50 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const narrowRequestBody = {
    post_ids: [post.id],
    community_ids: [community.id],
    author_memberuser_ids: [memberAuthorized.id],
    status: undefined,
    created_from: minRecent,
    created_to: maxRecent,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: "last_activity_at",
    sort_direction: "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimitNarrow,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const narrowAnalytics: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowAnalytics);

  const narrowPage = narrowAnalytics.pagination;
  TestValidator.equals("narrow page current", narrowPage.current, 1);
  TestValidator.equals("narrow page limit", narrowPage.limit, pageLimitNarrow);

  const narrowData = narrowAnalytics.data;

  // Extract rows that belong to our comments
  const ourCommentIds = new Set(comments.map((c) => c.id));
  const ourRecentIds = new Set(recentComments.map((c) => c.id));
  const ourOlderIds = new Set(olderComments.map((c) => c.id));

  const narrowRowsForOurComments = narrowData.filter((row) =>
    ourCommentIds.has(row.comment_id),
  );

  // All our rows in narrow query must be recent, not older
  for (const row of narrowRowsForOurComments) {
    TestValidator.predicate(
      "narrow analytics row should correspond only to recent comments",
      ourRecentIds.has(row.comment_id) && !ourOlderIds.has(row.comment_id),
    );
  }

  // Verify sorting by last_activity_at desc (fallback to created_at when undefined)
  const sortedSubset = [...narrowRowsForOurComments];
  for (let i = 1; i < sortedSubset.length; i++) {
    const prev = sortedSubset[i - 1];
    const curr = sortedSubset[i];
    const prevTime = prev.last_activity_at ?? prev.created_at;
    const currTime = curr.last_activity_at ?? curr.created_at;

    TestValidator.predicate(
      "narrow analytics rows are sorted by last_activity_at/created_at desc",
      prevTime >= currTime,
    );
  }

  // 12-14. Broad analytics query including all comments
  const pageLimitBroad = 50 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const broadRequestBody = {
    post_ids: [post.id],
    community_ids: [community.id],
    author_memberuser_ids: [memberAuthorized.id],
    status: undefined,
    created_from: minAll,
    created_to: maxAll,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: "last_activity_at",
    sort_direction: "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimitBroad,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const broadAnalytics: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: broadRequestBody,
      },
    );
  typia.assert(broadAnalytics);

  const broadPage = broadAnalytics.pagination;
  TestValidator.equals("broad page current", broadPage.current, 1);
  TestValidator.equals("broad page limit", broadPage.limit, pageLimitBroad);

  const broadData = broadAnalytics.data;
  const broadRowsForOurComments = broadData.filter((row) =>
    ourCommentIds.has(row.comment_id),
  );

  // Expect at least each of our comments to appear at least once (if analytics layer is consistent)
  for (const comment of comments) {
    const exists = broadRowsForOurComments.some(
      (row) => row.comment_id === comment.id,
    );
    TestValidator.predicate(
      "broad analytics contains row for each created comment (best-effort)",
      exists,
    );
  }

  // Basic coherence checks for pagination.records and pages
  TestValidator.predicate(
    "pagination.records non-negative",
    broadPage.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages non-negative",
    broadPage.pages >= 0,
  );
  if (broadPage.records > 0) {
    TestValidator.predicate(
      "pagination.records within pages*limit",
      broadPage.records <= broadPage.pages * broadPage.limit,
    );
  }
}
