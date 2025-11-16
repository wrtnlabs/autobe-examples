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
 * Validate admin comment analytics pagination and sorting.
 *
 * Business context:
 *
 * - Admin users need to review comment analytics (scores, reply counts, activity)
 *   across posts.
 * - Analytics are exposed via a paginated endpoint that supports sorting and
 *   filtering.
 * - Correct pagination and ordering are critical for reliable moderation and
 *   reporting tooling.
 *
 * Steps:
 *
 * 1. Register and authenticate a memberUser.
 * 2. As that memberUser, create a community.
 * 3. Create a community membership for the member in that community.
 * 4. Create a post in the community.
 * 5. Create many comments (e.g., 50) on the post to ensure multiple analytics
 *    pages.
 * 6. Register and authenticate an adminUser.
 * 7. Call the admin comment analytics endpoint for page=1, limit=10,
 *    sort_by="score", sort_direction="desc".
 * 8. Call the endpoint again for page=2 with the same filters.
 * 9. Assert:
 *
 *    - Both page 1 and 2 responses have valid pagination metadata.
 *    - Pagination.current equals the requested page; pagination.limit equals the
 *         requested limit.
 *    - Pagination.records and pagination.pages are consistent between page 1 and 2.
 *    - The sets of comment_ids in page 1 and page 2 do not overlap.
 *    - Combined count of comment_ids from page 1 and 2 does not exceed either
 *         records or 2 * limit.
 *    - Within each page, results are sorted by score descending.
 * 10. Request a page beyond the last (pages + 1) and assert that data is empty
 *     while pagination metadata is consistent.
 */
export async function test_api_admin_comment_analytics_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join also authenticates the session)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the memberUser
  const communityCreateBody = {
    slug: `comm-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a membership in that community for the memberUser
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create many comments on the post to populate analytics
  const commentCount = 50;
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    commentCount,
    async () => {
      const commentBody = {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parentCommentId: undefined,
      } satisfies ICommunityPlatformComment.ICreate;

      const created: ICommunityPlatformComment =
        await api.functional.communityPlatform.memberUser.posts.comments.create(
          connection,
          {
            postId: post.id,
            body: commentBody,
          },
        );
      typia.assert(created);
      return created;
    },
  );
  TestValidator.equals(
    "created comment count matches",
    comments.length,
    commentCount,
  );

  // 6. Register and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicitly log in as the same admin user to exercise login flow
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorized2: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized2);

  // 7. Call admin comment analytics for page 1
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const analyticsRequestPage1 = {
    post_ids: [post.id],
    community_ids: undefined,
    author_memberuser_ids: undefined,
    status: undefined,
    created_from: null,
    created_to: null,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: "score",
    sort_direction: "desc" as "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const page1: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      { body: analyticsRequestPage1 },
    );
  typia.assert(page1);

  // 8. Call admin comment analytics for page 2
  const analyticsRequestPage2 = {
    post_ids: [post.id],
    community_ids: undefined,
    author_memberuser_ids: undefined,
    status: undefined,
    created_from: null,
    created_to: null,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: "score",
    sort_direction: "desc" as "desc",
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const page2: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      { body: analyticsRequestPage2 },
    );
  typia.assert(page2);

  // 9. Validate pagination metadata consistency
  const pagination1: IPage.IPagination = page1.pagination;
  const pagination2: IPage.IPagination = page2.pagination;

  typia.assert(pagination1);
  typia.assert(pagination2);

  TestValidator.equals(
    "page1 current page matches request",
    pagination1.current,
    analyticsRequestPage1.page,
  );
  TestValidator.equals(
    "page2 current page matches request",
    pagination2.current,
    analyticsRequestPage2.page,
  );
  TestValidator.equals(
    "page1 limit matches request",
    pagination1.limit,
    analyticsRequestPage1.limit,
  );
  TestValidator.equals(
    "page2 limit matches request",
    pagination2.limit,
    analyticsRequestPage2.limit,
  );
  TestValidator.equals(
    "records count consistent between page1 and page2",
    pagination1.records,
    pagination2.records,
  );
  TestValidator.equals(
    "pages count consistent between page1 and page2",
    pagination1.pages,
    pagination2.pages,
  );

  const totalRecords = pagination1.records;

  const idsPage1 = page1.data.map((a) => a.comment_id);
  const idsPage2 = page2.data.map((a) => a.comment_id);

  const combinedIds = [...idsPage1, ...idsPage2];

  TestValidator.predicate(
    "combined count of ids from page1 and page2 does not exceed 2 * limit",
    combinedIds.length <= limit * 2,
  );
  TestValidator.predicate(
    "combined count of ids from page1 and page2 does not exceed totalRecords",
    combinedIds.length <= totalRecords,
  );

  const setPage1 = new Set(idsPage1);
  const overlapExists = idsPage2.some((id) => setPage1.has(id));
  TestValidator.predicate(
    "page1 and page2 have disjoint comment_ids",
    !overlapExists,
  );

  const assertSortedDescByScore = (
    title: string,
    summaries: ICommunityPlatformCommentAnalytics.ISummary[],
  ) => {
    for (let i = 0; i + 1 < summaries.length; ++i) {
      const current = summaries[i];
      const next = summaries[i + 1];
      TestValidator.predicate(
        `${title} score[${i}] >= score[${i + 1}]`,
        current.score >= next.score,
      );
    }
  };

  assertSortedDescByScore("page1 sorted by score desc", page1.data);
  assertSortedDescByScore("page2 sorted by score desc", page2.data);

  // 10. Request a page beyond the last page
  const beyondPageNumber = (pagination1.pages + 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const analyticsRequestBeyond = {
    post_ids: [post.id],
    community_ids: undefined,
    author_memberuser_ids: undefined,
    status: undefined,
    created_from: null,
    created_to: null,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: "score",
    sort_direction: "desc" as "desc",
    page: beyondPageNumber,
    limit,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const pageBeyond: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      { body: analyticsRequestBeyond },
    );
  typia.assert(pageBeyond);

  const paginationBeyond: IPage.IPagination = pageBeyond.pagination;
  typia.assert(paginationBeyond);

  TestValidator.equals(
    "beyond page current matches requested",
    paginationBeyond.current,
    analyticsRequestBeyond.page,
  );
  TestValidator.equals(
    "beyond page limit remains the same",
    paginationBeyond.limit,
    limit,
  );
  TestValidator.equals(
    "beyond page records equal initial records",
    paginationBeyond.records,
    totalRecords,
  );
  TestValidator.equals(
    "beyond page pages equal initial pages",
    paginationBeyond.pages,
    pagination1.pages,
  );
  TestValidator.equals("beyond page data is empty", pageBeyond.data.length, 0);
}
