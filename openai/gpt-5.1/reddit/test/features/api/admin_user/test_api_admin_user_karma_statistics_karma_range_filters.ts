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
 * Verify that minTotalKarma and maxTotalKarma filters on
 * /communityPlatform/adminUser/statistics/karma/byUser correctly constrain
 * which users appear in the analytics results.
 *
 * Business context:
 *
 * - Admins need to analyze member reputation by karma and slice users into bands
 *   (e.g., low/medium/high) using numeric ranges.
 * - This test creates three member users with different karma levels through
 *   posts, comments, and votes, then uses the admin analytics endpoint to
 *   confirm that a numeric karma band returns only users whose totalKarma lies
 *   inside the requested range.
 *
 * Steps:
 *
 * 1. Create an adminUser via join and confirm login works.
 * 2. Create three member users (low, mid, high) via join.
 * 3. Create a community as the low member and have all three members join it.
 * 4. For each member, create a post and a comment in the community.
 * 5. Cast votes so that high > mid > low in total karma (by upvoting their
 *    posts/comments with other users).
 * 6. As admin, call the karma byUser analytics with a "wide" request limited to
 *    these three users, and read their totalKarma values from response.
 * 7. Derive a band [minTotalKarma, maxTotalKarma] centered on the middle user’s
 *    totalKarma.
 * 8. Call analytics again with minTotalKarma/maxTotalKarma set to this band.
 * 9. Assert that:
 *
 *    - All returned users have totalKarma within the band.
 *    - At least one user is returned and the mid user is present.
 *    - Results are sorted by totalKarma in ascending order.
 */
export async function test_api_admin_user_karma_statistics_karma_range_filters(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and keep credentials
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

  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const reloggedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reloggedAdmin);

  // 2. Register three member users (low, mid, high)
  const createMember = async () => {
    const joinBody = {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPassw0rd!" as string & tags.MinLength<8>,
      ip: null,
      href: "https://app.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://app.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoin;

    const authorized: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
    typia.assert(authorized);

    return { joinBody, authorized };
  };

  const memberLow = await createMember();
  const memberMid = await createMember();
  const memberHigh = await createMember();

  // Helper: log in as a member by their join body
  const loginMemberByJoin = async (
    joinBody: ICommunityPlatformMemberuser.IJoin,
  ): Promise<ICommunityPlatformMemberuser.IAuthorized> => {
    const loginBody = {
      identifier: joinBody.username,
      password: joinBody.password,
      ip: null,
      href: "https://app.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://app.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILogin;

    const authorized: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: loginBody,
      });
    typia.assert(authorized);
    return authorized;
  };

  // 3. Create a community as memberLow
  await loginMemberByJoin(memberLow.joinBody);

  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MaxLength<4000>,
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

  // 4. Join all three members to the community
  const createMembershipForMember = async (member: {
    joinBody: ICommunityPlatformMemberuser.IJoin;
  }): Promise<ICommunityPlatformCommunityMembership> => {
    await loginMemberByJoin(member.joinBody);

    const membershipBody = {
      role: "member",
      isApproved: true,
      isBanned: false,
    } satisfies ICommunityPlatformCommunityMembership.ICreate;

    const membership: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.memberUser.communities.memberships.create(
        connection,
        {
          communitySlug: community.slug,
          body: membershipBody,
        },
      );
    typia.assert(membership);
    return membership;
  };

  await createMembershipForMember(memberLow);
  await createMembershipForMember(memberMid);
  await createMembershipForMember(memberHigh);

  // 5. For each member, create a post and a comment to give them content
  const createPostAndCommentForMember = async (member: {
    joinBody: ICommunityPlatformMemberuser.IJoin;
    authorized: ICommunityPlatformMemberuser.IAuthorized;
  }): Promise<{
    post: ICommunityPlatformPost;
    comment: ICommunityPlatformComment;
  }> => {
    await loginMemberByJoin(member.joinBody);

    const postBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postBody,
        },
      );
    typia.assert(post);

    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentBody,
        },
      );
    typia.assert(comment);

    return { post, comment };
  };

  const lowContent = await createPostAndCommentForMember(memberLow);
  const midContent = await createPostAndCommentForMember(memberMid);
  const highContent = await createPostAndCommentForMember(memberHigh);

  // 6. Cast votes to shape karma ordering: High > Mid > Low
  const upvotePost = async (
    voter: { joinBody: ICommunityPlatformMemberuser.IJoin },
    targetPost: ICommunityPlatformPost,
  ): Promise<ICommunityPlatformPostVote> => {
    await loginMemberByJoin(voter.joinBody);

    const voteBody = {
      direction: "up",
    } satisfies ICommunityPlatformPostVote.ICreate;

    const vote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: targetPost.id,
          body: voteBody,
        },
      );
    typia.assert(vote);
    return vote;
  };

  const upvoteComment = async (
    voter: { joinBody: ICommunityPlatformMemberuser.IJoin },
    targetComment: ICommunityPlatformComment,
  ): Promise<ICommunityPlatformCommentVote> => {
    await loginMemberByJoin(voter.joinBody);

    const voteBody = {
      direction: "up",
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: targetComment.id,
          body: voteBody,
        },
      );
    typia.assert(vote);
    return vote;
  };

  // Give High user more upvotes than Mid, and Mid more than Low
  await upvotePost(memberLow, highContent.post);
  await upvotePost(memberMid, highContent.post);
  await upvoteComment(memberLow, highContent.comment);
  await upvoteComment(memberMid, highContent.comment);

  await upvotePost(memberLow, midContent.post);
  await upvoteComment(memberLow, midContent.comment);

  await upvotePost(memberMid, lowContent.post);

  // 7. Log back in as admin for analytics
  const adminAgain: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAgain);

  // 8. Wide analytics query to capture karma for test users
  const wideRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    userIds: [
      memberLow.authorized.id,
      memberMid.authorized.id,
      memberHigh.authorized.id,
    ],
    communityIds: [community.id],
    minTotalKarma: undefined,
    maxTotalKarma: undefined,
    fromEventAt: null,
    toEventAt: null,
    sortBy: "totalKarma" as const,
    sortDirection: "asc" as const,
  } satisfies ICommunityPlatformKarmaByUserStatistics.IRequest;

  const widePage: IPageICommunityPlatformKarmaByUserStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byUser.index(
      connection,
      { body: wideRequestBody },
    );
  typia.assert(widePage);

  // Locate stats for our three users from topUsers
  const findUserStat = (
    userId: string & tags.Format<"uuid">,
  ): ICommunityPlatformKarmaByUserStatisticsTopUser.ISummary => {
    const topUsers = widePage.data.flatMap((summary) => summary.topUsers);
    const found = topUsers.find((u) => u.userId === userId);
    if (!found) {
      throw new Error(`Expected user ${userId} to appear in karma statistics.`);
    }
    return found;
  };

  const lowStat = findUserStat(memberLow.authorized.id);
  const midStat = findUserStat(memberMid.authorized.id);
  const highStat = findUserStat(memberHigh.authorized.id);

  // Basic sanity checks on ordering
  TestValidator.predicate(
    "high totalKarma should be >= mid",
    highStat.totalKarma >= midStat.totalKarma,
  );
  TestValidator.predicate(
    "mid totalKarma should be >= low",
    midStat.totalKarma >= lowStat.totalKarma,
  );
  TestValidator.predicate(
    "high totalKarma should be > low",
    highStat.totalKarma > lowStat.totalKarma,
  );

  // Derive a band centered on the middle totalKarma
  const wideStats = [lowStat, midStat, highStat];
  const sortedByKarma = [...wideStats].sort(
    (a, b) => a.totalKarma - b.totalKarma,
  );
  const middle = sortedByKarma[1];

  const bandMin = middle.totalKarma;
  const bandMax = middle.totalKarma;

  // 9. Banded analytics query using minTotalKarma/maxTotalKarma
  const bandRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    userIds: undefined,
    communityIds: [community.id],
    minTotalKarma: bandMin,
    maxTotalKarma: bandMax,
    fromEventAt: null,
    toEventAt: null,
    sortBy: "totalKarma" as const,
    sortDirection: "asc" as const,
  } satisfies ICommunityPlatformKarmaByUserStatistics.IRequest;

  const bandPage: IPageICommunityPlatformKarmaByUserStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byUser.index(
      connection,
      { body: bandRequestBody },
    );
  typia.assert(bandPage);

  // 10. Validate banded results
  const allTopUsers = bandPage.data.flatMap((summary) => summary.topUsers);

  TestValidator.predicate(
    "banded query should return at least one user",
    allTopUsers.length > 0,
  );

  for (const user of allTopUsers) {
    TestValidator.predicate(
      "user totalKarma within band",
      user.totalKarma >= bandMin && user.totalKarma <= bandMax,
    );
  }

  const idsInBand = new Set(allTopUsers.map((u) => u.userId));
  TestValidator.predicate(
    "mid user should be included in band",
    idsInBand.has(midStat.userId),
  );

  // 11. Verify sorting by totalKarma asc in banded results
  const sortedBandIds = [...allTopUsers]
    .sort((a, b) => a.totalKarma - b.totalKarma)
    .map((u) => u.userId);
  const actualBandIds = allTopUsers.map((u) => u.userId);

  TestValidator.equals(
    "banded results sorted by totalKarma asc",
    actualBandIds,
    sortedBandIds,
  );
}
