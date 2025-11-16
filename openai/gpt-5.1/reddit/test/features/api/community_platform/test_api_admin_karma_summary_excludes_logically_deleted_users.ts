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
import type { ICommunityPlatformKarmaSummaryStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaSummaryStatistics";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserKarma";

export async function test_api_admin_karma_summary_excludes_logically_deleted_users(
  connection: api.IConnection,
) {
  // 1. Admin join (also yields authorized token)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1nP@ssw0rd" as string & tags.Format<"password">,
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

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Create two member users (store their join credentials for later login)
  const createMemberUser = async (): Promise<{
    authorized: ICommunityPlatformMemberuser.IAuthorized;
    username: string;
    password: string & tags.MinLength<8>;
  }> => {
    const password = RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<8>;

    const joinBody = {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password,
      ip: null,
      href: "https://app.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoin;

    const authorized: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
    typia.assert(authorized);

    return {
      authorized,
      username: joinBody.username,
      password,
    };
  };

  const memberAResult = await createMemberUser();
  const memberBResult = await createMemberUser();
  const memberA = memberAResult.authorized;
  const memberB = memberBResult.authorized;

  // Helper to (re)login as a member user with correct password
  const loginMember = async (
    username: string,
    password: string & tags.MinLength<8>,
  ) => {
    const loginBody = {
      identifier: username,
      password,
      ip: null,
      href: "https://app.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://app.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILogin;

    const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: loginBody,
      });
    typia.assert(loggedIn);
  };

  // 3. Member A: create community, membership, post, comment, votes
  await loginMember(memberAResult.username, memberAResult.password);

  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MaxLength<4000>,
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

  const membershipCreateBodyA = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyA,
      },
    );
  typia.assert(membershipA);

  const postCreateBodyA = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBodyA,
    });
  typia.assert(postA);

  const commentCreateBodyA = {
    content: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentCreateBodyA,
      },
    );
  typia.assert(commentA);

  const postVoteBodyA = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVoteA: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postA.id,
        body: postVoteBodyA,
      },
    );
  typia.assert(postVoteA);

  const commentVoteBodyA = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVoteA: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentA.id,
        body: commentVoteBodyA,
      },
    );
  typia.assert(commentVoteA);

  // 4. Member B: join same community, create post/comment, votes
  await loginMember(memberBResult.username, memberBResult.password);

  const membershipCreateBodyB = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyB,
      },
    );
  typia.assert(membershipB);

  const postCreateBodyB = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBodyB,
    });
  typia.assert(postB);

  const commentCreateBodyB = {
    content: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id,
        body: commentCreateBodyB,
      },
    );
  typia.assert(commentB);

  const postVoteBodyB = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVoteB: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postB.id,
        body: postVoteBodyB,
      },
    );
  typia.assert(postVoteB);

  const commentVoteBodyB = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVoteB: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentB.id,
        body: commentVoteBodyB,
      },
    );
  typia.assert(commentVoteB);

  // 5. Switch back to admin context before admin-only endpoints
  const adminRelogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 6. Admin: query user karma aggregates
  const adminIndexBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortBy: "totalKarma" as const,
    sortDirection: "desc" as const,
    memberUserId: undefined,
    minTotalKarma: undefined,
    maxTotalKarma: undefined,
    minPostKarma: undefined,
    maxPostKarma: undefined,
    minCommentKarma: undefined,
    maxCommentKarma: undefined,
  } satisfies ICommunityPlatformUserKarma.IRequest;

  const karmaPage: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      { body: adminIndexBody },
    );
  typia.assert(karmaPage);

  const karmaForA = karmaPage.data.find(
    (k) => k.memberuser.username === memberA.username,
  );
  const karmaForB = karmaPage.data.find(
    (k) => k.memberuser.username === memberB.username,
  );

  TestValidator.predicate(
    "karma aggregates for both members should exist",
    karmaForA !== undefined && karmaForB !== undefined,
  );

  typia.assertGuard<ICommunityPlatformUserKarma.ISummary>(karmaForA!);
  typia.assertGuard<ICommunityPlatformUserKarma.ISummary>(karmaForB!);

  const survivingKarma = karmaForA!;
  const deletedKarma = karmaForB!;

  // 7. Logically delete B's karma row using admin erase
  await api.functional.communityPlatform.adminUser.userKarmas.erase(
    connection,
    { userKarmaId: deletedKarma.id },
  );

  // 8. Fetch summary statistics and validate
  const summary: ICommunityPlatformKarmaSummaryStatistics =
    await api.functional.communityPlatform.adminUser.statistics.karma.summary.index(
      connection,
    );
  typia.assert(summary);

  // active_user_count must be at least 1 and must not count deleted user
  TestValidator.predicate(
    "active_user_count should be at least 1",
    summary.active_user_count >= 1,
  );

  // In our controlled test we expect exactly one active karma user (member A)
  TestValidator.equals(
    "active_user_count should collapse to surviving user only",
    summary.active_user_count,
    1,
  );

  TestValidator.equals(
    "total_post_karma_sum equals surviving user's post_karma",
    summary.total_post_karma_sum,
    survivingKarma.post_karma,
  );
  TestValidator.equals(
    "total_comment_karma_sum equals surviving user's comment_karma",
    summary.total_comment_karma_sum,
    survivingKarma.comment_karma,
  );
  TestValidator.equals(
    "total_karma_sum equals surviving user's total_karma",
    summary.total_karma_sum,
    survivingKarma.total_karma,
  );

  if (
    summary.average_total_karma !== null &&
    summary.average_total_karma !== undefined
  ) {
    TestValidator.equals(
      "average_total_karma equals surviving user's total_karma",
      summary.average_total_karma,
      survivingKarma.total_karma,
    );
  }
  if (
    summary.max_total_karma !== null &&
    summary.max_total_karma !== undefined
  ) {
    TestValidator.equals(
      "max_total_karma equals surviving user's total_karma",
      summary.max_total_karma,
      survivingKarma.total_karma,
    );
  }
  if (
    summary.min_total_karma !== null &&
    summary.min_total_karma !== undefined
  ) {
    TestValidator.equals(
      "min_total_karma equals surviving user's total_karma",
      summary.min_total_karma,
      survivingKarma.total_karma,
    );
  }
  if (
    summary.median_total_karma !== null &&
    summary.median_total_karma !== undefined
  ) {
    TestValidator.equals(
      "median_total_karma equals surviving user's total_karma",
      summary.median_total_karma,
      survivingKarma.total_karma,
    );
  }
  if (
    summary.p90_total_karma !== null &&
    summary.p90_total_karma !== undefined
  ) {
    TestValidator.equals(
      "p90_total_karma equals surviving user's total_karma",
      summary.p90_total_karma,
      survivingKarma.total_karma,
    );
  }
  if (
    summary.p99_total_karma !== null &&
    summary.p99_total_karma !== undefined
  ) {
    TestValidator.equals(
      "p99_total_karma equals surviving user's total_karma",
      summary.p99_total_karma,
      survivingKarma.total_karma,
    );
  }
}
