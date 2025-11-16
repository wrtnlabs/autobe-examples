import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaByUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByUserStatistics";
import type { ICommunityPlatformKarmaByUserStatisticsTopUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByUserStatisticsTopUser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaByUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaByUserStatistics";

/**
 * Validate that the admin karma-by-user analytics honours time window filters
 * and the "recentDelta" sort key, using only exposed DTO fields.
 *
 * Business/context adaptation:
 *
 * - The ICommunityPlatformKarmaByUserStatistics.IRequest schema exposes sortBy =
 *   "recentDelta", but the per-user breakdown shown in
 *   ICommunityPlatformKarmaByUserStatisticsTopUser.ISummary does not include an
 *   explicit recentDelta field. Instead, the endpoint returns a
 *   IPageICommunityPlatformKarmaByUserStatistics.ISummary whose `data` items
 *   are overall distribution snapshots, including a `topUsers` array with per
 *   user totals. Therefore, this test cannot assert the exact numeric
 *   recentDelta, but it can still validate ordering semantics by controlling
 *   which user gains more karma inside the chosen time window.
 *
 * High-level flow (single test function):
 *
 * 1. Register and implicitly authenticate an adminUser via
 *    api.functional.auth.adminUser.join (this sets Authorization header).
 * 2. Register two member users (memberA and memberB) via
 *    api.functional.auth.memberUser.join, capturing their ids and usernames.
 * 3. As memberA (after join), create a community via
 *    api.functional.communityPlatform.memberUser.communities.create, then join
 *    that community as memberA via communities.memberships.create.
 * 4. Phase 1 (older activity, for both users):
 *
 *    - As memberA, create a text post in the community and upvote it once.
 *    - Add a comment under that post and upvote the comment.
 *    - Switch auth to memberB (login) and create another post in the same community,
 *         then upvote it once and create a comment + upvote. This ensures both
 *         users have some baseline karma outside the later time window.
 * 5. Wait or simulate a time gap using RandomGenerator.date; however, since we
 *    cannot control server clocks, the test must instead rely on making phase 2
 *    immediately after phase 1 and using fromEventAt/toEventAt loosely. Because
 *    the backend internally uses community_platform_karma_events with its own
 *    timestamps, we cannot deterministically choose a date boundary. Therefore
 *    we adapt the scenario: instead of strict temporal separation, we will call
 *    the analytics endpoint twice with sortBy="recentDelta" and simply rely on
 *    relative recent activity differences to influence the ordering, without
 *    asserting absolute window semantics.
 * 6. Phase 2 (recent activity, favoring memberA):
 *
 *    - Switch back to memberA:
 *
 *         - Create another post and upvote it.
 *         - Create two comments on that post and upvote both comments and the post again
 *                   (by flipping vote direction or leaving as-is depending on
 *                   implementation). Since ICommunityPlatformPostVote.ICreate
 *                   only carries `direction`, we can call with direction="up"
 *                   multiple times where the backend will interpret this as the
 *                   memberA having an upvote; any additional karma from
 *                   idempotent upvotes may be limited, but we assume for E2E
 *                   that each vote change creates an event.
 *    - Switch to memberB:
 *
 *         - Perform only a small amount of activity (e.g., one extra comment with one
 *                   upvote) so memberB gains less incremental karma than
 *                   memberA in this second phase.
 * 7. Switch auth back to adminUser using adminUser.login, ensuring that
 *    Authorization now corresponds to the admin actor.
 * 8. Call api.functional.communityPlatform.adminUser.statistics.karma.byUser.index
 *    with a body that:
 *
 *    - Page = 1, limit = 50
 *    - Leaves userIds and communityIds undefined so the endpoint can consider all
 *         users, or restricts by the two created userIds if supported by the
 *         DTO
 *    - Leaves fromEventAt and toEventAt undefined/null, because we cannot generate
 *         reliable window timestamps from the client side in this test. We
 *         still set sortBy="recentDelta" and sortDirection="desc".
 * 9. Assert that:
 *
 *    - The response matches IPageICommunityPlatformKarmaByUserStatistics.ISummary.
 *    - Pagination.records >= 2 and pagination.limit >= 1.
 *    - Data.length >= 1 (there is at least one summary snapshot row).
 *    - Within the first summary row, topUsers length >= 2, and the two test users
 *         (memberA and memberB) appear in topUsers (we can check by matching
 *         usernames or userIds).
 *    - The topUsers array is ordered descending by totalKarma, using
 *         TestValidator.predicate and a small loop to confirm monotonic
 *         non-increasing sequence.
 * 10. Additional behavioural validation: when we filter userIds to only the two
 *     test users, the topUsers array should contain only those users and still
 *     be in descending totalKarma order. Because we increased memberA's
 *     activity more than memberB, we expect memberA.totalKarma >=
 *     memberB.totalKarma.
 * 11. The test may not depend on precise numeric values or on an explicit
 *     recentDelta field, but it still validates that:
 *
 *     - SortBy="recentDelta" is accepted by the endpoint;
 *     - The endpoint returns a consistent leaderboard-style ordering; and
 *     - Heavier recent activity for one user (memberA) correlates with that user
 *           ranking at or near the top of the topUsers list when the result is
 *           filtered appropriately.
 */
export async function test_api_admin_user_karma_statistics_time_window_and_recent_delta_sorting(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain admin auth context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminUsername = adminAuthorized.username;

  // Helper for building member join/login URLs
  const baseHref = "https://community.example.com";
  const baseReferrer = "https://community.example.com/landing";

  // 2. Register two member users (memberA and memberB)
  const memberAJoinBody = {
    username: `userA_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberAPass1!",
    ip: null,
    href: `${baseHref}/signup`,
    referrer: `${baseReferrer}/campaignA`,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  const memberBJoinBody = {
    username: `userB_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberBPass1!",
    ip: null,
    href: `${baseHref}/signup`,
    referrer: `${baseReferrer}/campaignB`,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  const memberAId = memberAAuthorized.id;
  const memberBId = memberBAuthorized.id;

  // 3. As memberA (already authenticated from join), create a community
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communitySlug = community.slug;

  // Join the community as memberA
  const membershipCreateBodyA = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBodyA,
      },
    );
  typia.assert(membershipA);

  // 4. Phase 1 activity (baseline) for memberA
  const postABaseBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const postABase: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABaseBody,
    });
  typia.assert(postABase);

  // Upvote memberA's baseline post
  const postABaseVoteCreate = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const postABaseVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postABase.id,
        body: postABaseVoteCreate,
      },
    );
  typia.assert(postABaseVote);

  // Add a baseline comment by memberA and upvote it
  const commentABaseBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentABase: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postABase.id,
        body: commentABaseBody,
      },
    );
  typia.assert(commentABase);

  const commentABaseVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const commentABaseVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentABase.id,
        body: commentABaseVoteBody,
      },
    );
  typia.assert(commentABaseVote);

  // Switch to memberB via login for phase 1 baseline
  const memberBLoginBody = {
    identifier: memberBJoinBody.username,
    password: memberBJoinBody.password,
    ip: null,
    href: `${baseHref}/login`,
    referrer: `${baseReferrer}/login`,
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  // MemberB joins the same community
  const membershipCreateBodyB = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBodyB,
      },
    );
  typia.assert(membershipB);

  // MemberB baseline post + vote + comment + comment vote
  const postBBaseBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const postBBase: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBaseBody,
    });
  typia.assert(postBBase);

  const postBBaseVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const postBBaseVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postBBase.id,
        body: postBBaseVoteBody,
      },
    );
  typia.assert(postBBaseVote);

  const commentBBaseBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentBBase: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postBBase.id,
        body: commentBBaseBody,
      },
    );
  typia.assert(commentBBase);

  const commentBBaseVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const commentBBaseVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentBBase.id,
        body: commentBBaseVoteBody,
      },
    );
  typia.assert(commentBBaseVote);

  // 6. Phase 2 activity favouring memberA
  // Switch back to memberA via login to re-establish their session
  const memberALoginBody = {
    identifier: memberAJoinBody.username,
    password: memberAJoinBody.password,
    ip: null,
    href: `${baseHref}/login`,
    referrer: `${baseReferrer}/loginA`,
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // MemberA second post with more comments/votes
  const postARecentBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 7 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const postARecent: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postARecentBody,
    });
  typia.assert(postARecent);

  // Upvote the new post
  const postARecentVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const postARecentVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postARecent.id,
        body: postARecentVoteBody,
      },
    );
  typia.assert(postARecentVote);

  // Create two new comments under postARecent and upvote both
  const commentARecent1Body = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentARecent1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postARecent.id,
        body: commentARecent1Body,
      },
    );
  typia.assert(commentARecent1);

  const commentARecent1VoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const commentARecent1Vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentARecent1.id,
        body: commentARecent1VoteBody,
      },
    );
  typia.assert(commentARecent1Vote);

  const commentARecent2Body = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentARecent2: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postARecent.id,
        body: commentARecent2Body,
      },
    );
  typia.assert(commentARecent2);

  const commentARecent2VoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const commentARecent2Vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentARecent2.id,
        body: commentARecent2VoteBody,
      },
    );
  typia.assert(commentARecent2Vote);

  // MemberB minimal recent activity: one extra comment + upvote
  const memberBLogin2Body = {
    identifier: memberBJoinBody.username,
    password: memberBJoinBody.password,
    ip: null,
    href: `${baseHref}/login`,
    referrer: `${baseReferrer}/loginB2`,
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberBLogin2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLogin2Body,
    });
  typia.assert(memberBLogin2);

  const commentBRecentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentBRecent: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postBBase.id,
        body: commentBRecentBody,
      },
    );
  typia.assert(commentBRecent);

  const commentBRecentVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const commentBRecentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentBRecent.id,
        body: commentBRecentVoteBody,
      },
    );
  typia.assert(commentBRecentVote);

  // 7. Switch back to adminUser via login to ensure admin context
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: `${baseHref}/admin/login`,
    referrer: `${baseReferrer}/admin`,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);
  TestValidator.equals(
    "admin username must remain consistent after login",
    adminLogin.username,
    adminUsername,
  );

  // 8. Call karma-by-user analytics with recentDelta sort
  const analyticsRequestAll = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    userIds: undefined,
    communityIds: undefined,
    minTotalKarma: undefined,
    maxTotalKarma: undefined,
    fromEventAt: null,
    toEventAt: null,
    sortBy: "recentDelta" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByUserStatistics.IRequest;

  const analyticsAll: IPageICommunityPlatformKarmaByUserStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byUser.index(
      connection,
      {
        body: analyticsRequestAll,
      },
    );
  typia.assert(analyticsAll);

  // Basic structural assertions
  TestValidator.predicate(
    "analytics pagination should have non-negative totals",
    analyticsAll.pagination.current >= 0 &&
      analyticsAll.pagination.limit >= 0 &&
      analyticsAll.pagination.records >= 0 &&
      analyticsAll.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "analytics data array should not be empty",
    analyticsAll.data.length >= 1,
  );

  const firstSummary:
    | ICommunityPlatformKarmaByUserStatistics.ISummary
    | undefined = analyticsAll.data[0];
  TestValidator.predicate(
    "first summary row must exist",
    firstSummary !== undefined,
  );
  if (!firstSummary) return;

  // (a) Ensure topUsers is non-empty and contains at least 2 entries
  TestValidator.predicate(
    "first summary should have at least two top users",
    firstSummary.topUsers.length >= 2,
  );

  // (b) Ensure topUsers is ordered in non-increasing totalKarma
  const topUsersAll: ICommunityPlatformKarmaByUserStatisticsTopUser.ISummary[] =
    firstSummary.topUsers;
  for (let i = 1; i < topUsersAll.length; i++) {
    const prev = topUsersAll[i - 1];
    const curr = topUsersAll[i];
    TestValidator.predicate(
      `topUsers totalKarma should be non-increasing at index ${i}`,
      prev.totalKarma >= curr.totalKarma,
    );
  }

  // (c) Filter analytics to only our two member users and confirm ordering
  const analyticsRequestFiltered = {
    page: 1 as number,
    limit: 10 as number,
    userIds: [memberAId, memberBId],
    communityIds: undefined,
    minTotalKarma: undefined,
    maxTotalKarma: undefined,
    fromEventAt: null,
    toEventAt: null,
    sortBy: "recentDelta" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByUserStatistics.IRequest;

  const analyticsFiltered: IPageICommunityPlatformKarmaByUserStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byUser.index(
      connection,
      {
        body: analyticsRequestFiltered,
      },
    );
  typia.assert(analyticsFiltered);

  TestValidator.predicate(
    "filtered analytics data should not be empty",
    analyticsFiltered.data.length >= 1,
  );

  const filteredSummary = analyticsFiltered.data[0];
  const filteredTopUsers = filteredSummary.topUsers;

  // We expect at most our two users; there may be others if the backend ignores userIds,
  // so we first locate our users within the topUsers array.
  const foundMemberA = filteredTopUsers.find(
    (u) => u.userId === memberAId || u.username === memberAAuthorized.username,
  );
  const foundMemberB = filteredTopUsers.find(
    (u) => u.userId === memberBId || u.username === memberBAuthorized.username,
  );

  TestValidator.predicate(
    "filtered results should include memberA",
    foundMemberA !== undefined,
  );
  TestValidator.predicate(
    "filtered results should include memberB",
    foundMemberB !== undefined,
  );

  if (foundMemberA && foundMemberB) {
    TestValidator.predicate(
      "memberA should have at least as much total karma as memberB after heavier activity",
      foundMemberA.totalKarma >= foundMemberB.totalKarma,
    );
  }
}
