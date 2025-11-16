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

export async function test_api_admin_user_karma_statistics_filter_by_user_and_community(
  connection: api.IConnection,
) {
  // 1. Create admin user and obtain authorized context (token handled by SDK)
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

  // 2. Create two member users (User A, User B)
  const memberJoinCommon = {
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.app/join",
    referrer: "https://client.app/landing",
  } satisfies Pick<
    ICommunityPlatformMemberuser.IJoin,
    "password" | "ip" | "href" | "referrer"
  >;

  const userAJoinBody = {
    username: `userA_${RandomGenerator.alphabets(8)}` as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: typia.random<string & tags.Format<"email">>(),
    ...memberJoinCommon,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userAAuthorized);

  const userBJoinBody = {
    username: `userB_${RandomGenerator.alphabets(8)}` as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: typia.random<string & tags.Format<"email">>(),
    ...memberJoinCommon,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userBAuthorized);

  const userAId = userAAuthorized.id;
  const userBId = userBAuthorized.id;

  // 3. Create two communities as User A
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: userAJoinBody.email,
      password: memberJoinCommon.password,
      ip: null,
      href: "https://client.app/login",
      referrer: "https://client.app/home",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const community1Body = {
    slug: `community-${RandomGenerator.alphabets(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community1Body },
    );
  typia.assert(community1);

  const community2Body = {
    slug: `community-${RandomGenerator.alphabets(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community2Body },
    );
  typia.assert(community2);

  // 4. Join memberships: User A -> C1 & C2, User B -> C2
  // User A is already logged in
  const membershipRoleMember = "member";
  const membershipABodyC1 = {
    role: membershipRoleMember,
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipAC1: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community1.slug,
        body: membershipABodyC1,
      },
    );
  typia.assert(membershipAC1);

  const membershipABodyC2 = {
    role: membershipRoleMember,
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipAC2: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community2.slug,
        body: membershipABodyC2,
      },
    );
  typia.assert(membershipAC2);

  // Switch to User B to join C2
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: userBJoinBody.email,
      password: memberJoinCommon.password,
      ip: null,
      href: "https://client.app/login",
      referrer: "https://client.app/home",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const membershipBBodyC2 = {
    role: membershipRoleMember,
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipBC2: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community2.slug,
        body: membershipBBodyC2,
      },
    );
  typia.assert(membershipBC2);

  // 5. Generate karma-impacting activity
  // Helper to create a post in a community by current logged-in member
  const createPostInCommunity = async (
    community: ICommunityPlatformCommunity,
  ): Promise<ICommunityPlatformPost> => {
    const body = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Helper to create a comment on a post
  const createCommentOnPost = async (
    post: ICommunityPlatformPost,
  ): Promise<ICommunityPlatformComment> => {
    const body = {
      content: RandomGenerator.paragraph({ sentences: 4 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(comment);
    return comment;
  };

  // Helper to vote on post
  const voteOnPost = async (
    post: ICommunityPlatformPost,
    direction: string,
  ): Promise<ICommunityPlatformPostVote> => {
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformPostVote.ICreate;
    const vote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: voteBody,
        },
      );
    typia.assert(vote);
    return vote;
  };

  // Helper to vote on comment
  const voteOnComment = async (
    comment: ICommunityPlatformComment,
    direction: string,
  ): Promise<ICommunityPlatformCommentVote> => {
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformCommentVote.ICreate;
    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: comment.id as string & tags.Format<"uuid">,
          body: voteBody,
        },
      );
    typia.assert(vote);
    return vote;
  };

  // User B activity: posts & comments in C2 only (already logged in as B)
  const userBPostC2: ICommunityPlatformPost =
    await createPostInCommunity(community2);
  const userBCommentC2: ICommunityPlatformComment =
    await createCommentOnPost(userBPostC2);

  // Multiple upvotes for User B's post/comment to amplify their karma in C2
  await voteOnPost(userBPostC2, "up");
  await voteOnPost(userBPostC2, "up");
  await voteOnComment(userBCommentC2, "up");

  // Switch back to User A and create activity in both C1 and C2
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: userAJoinBody.email,
      password: memberJoinCommon.password,
      ip: null,
      href: "https://client.app/login",
      referrer: "https://client.app/home",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const userAPostC1: ICommunityPlatformPost =
    await createPostInCommunity(community1);
  const userACommentC1: ICommunityPlatformComment =
    await createCommentOnPost(userAPostC1);
  await voteOnPost(userAPostC1, "up");
  await voteOnComment(userACommentC1, "up");

  const userAPostC2: ICommunityPlatformPost =
    await createPostInCommunity(community2);
  const userACommentC2: ICommunityPlatformComment =
    await createCommentOnPost(userAPostC2);
  await voteOnPost(userAPostC2, "up");

  // 6. Switch to admin context for analytics
  await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.client.app/login",
      referrer: "https://admin.client.app/home",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });

  // 7. First analytics query: filter by User A + Community1
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  const requestBodyUserACommunity1 = {
    page,
    limit,
    userIds: [userAId],
    communityIds: [community1.id],
    minTotalKarma: undefined,
    maxTotalKarma: undefined,
    fromEventAt: null,
    toEventAt: null,
    sortBy: "totalKarma" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByUserStatistics.IRequest;

  const pageUserACommunity1: IPageICommunityPlatformKarmaByUserStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byUser.index(
      connection,
      {
        body: requestBodyUserACommunity1,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaByUserStatistics.ISummary>(
    pageUserACommunity1,
  );

  // Basic pagination assertions
  TestValidator.equals(
    "pagination current page should equal requested page (UserA+C1)",
    pageUserACommunity1.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit (UserA+C1)",
    pageUserACommunity1.pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be non-negative (UserA+C1)",
    pageUserACommunity1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative (UserA+C1)",
    pageUserACommunity1.pagination.pages >= 0,
  );

  // Data-level sanity
  TestValidator.predicate(
    "data length should be >= 0 (UserA+C1)",
    pageUserACommunity1.data.length >= 0,
  );

  // If there are summaries, ensure they respect non-negative metrics and topUsers filtered by User A
  for (const summary of pageUserACommunity1.data) {
    TestValidator.predicate(
      "totalUsers should be non-negative (UserA+C1)",
      summary.totalUsers >= 0,
    );
    TestValidator.predicate(
      "totalKarma should be non-negative (UserA+C1)",
      summary.totalKarma >= 0,
    );
    TestValidator.predicate(
      "averageKarmaPerUser should be non-negative (UserA+C1)",
      summary.averageKarmaPerUser >= 0,
    );
    TestValidator.predicate(
      "medianKarma should be non-negative (UserA+C1)",
      summary.medianKarma >= 0,
    );
    TestValidator.predicate(
      "p90Karma should be non-negative (UserA+C1)",
      summary.p90Karma >= 0,
    );
    TestValidator.predicate(
      "p99Karma should be non-negative (UserA+C1)",
      summary.p99Karma >= 0,
    );

    if (summary.topUsers.length > 0) {
      for (const topUser of summary.topUsers) {
        // In this filtered query, only User A is allowed in topUsers by userIds AND communityIds filter
        TestValidator.equals(
          "topUsers userId should equal User A id when filtered by userIds=[UserA] and communityIds=[C1]",
          topUser.userId,
          userAId,
        );
      }
    }
  }

  // 8. Second analytics query: User A + User B in Community2
  const requestBodyUsersABCommunity2 = {
    page,
    limit,
    userIds: [userAId, userBId],
    communityIds: [community2.id],
    minTotalKarma: undefined,
    maxTotalKarma: undefined,
    fromEventAt: null,
    toEventAt: null,
    sortBy: "totalKarma" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByUserStatistics.IRequest;

  const pageUsersABCommunity2: IPageICommunityPlatformKarmaByUserStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byUser.index(
      connection,
      {
        body: requestBodyUsersABCommunity2,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaByUserStatistics.ISummary>(
    pageUsersABCommunity2,
  );

  TestValidator.equals(
    "pagination current page should equal requested page (UsersA+B+C2)",
    pageUsersABCommunity2.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit (UsersA+B+C2)",
    pageUsersABCommunity2.pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be non-negative (UsersA+B+C2)",
    pageUsersABCommunity2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative (UsersA+B+C2)",
    pageUsersABCommunity2.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data length should be >= 0 (UsersA+B+C2)",
    pageUsersABCommunity2.data.length >= 0,
  );

  for (const summary of pageUsersABCommunity2.data) {
    TestValidator.predicate(
      "totalUsers should be non-negative (UsersA+B+C2)",
      summary.totalUsers >= 0,
    );
    TestValidator.predicate(
      "totalKarma should be non-negative (UsersA+B+C2)",
      summary.totalKarma >= 0,
    );
    TestValidator.predicate(
      "averageKarmaPerUser should be non-negative (UsersA+B+C2)",
      summary.averageKarmaPerUser >= 0,
    );
    TestValidator.predicate(
      "medianKarma should be non-negative (UsersA+B+C2)",
      summary.medianKarma >= 0,
    );
    TestValidator.predicate(
      "p90Karma should be non-negative (UsersA+B+C2)",
      summary.p90Karma >= 0,
    );
    TestValidator.predicate(
      "p99Karma should be non-negative (UsersA+B+C2)",
      summary.p99Karma >= 0,
    );

    if (summary.topUsers.length > 0) {
      for (const topUser of summary.topUsers) {
        // In this filtered query, topUsers must be subset of {UserA, UserB}
        TestValidator.predicate(
          "topUsers userId should be one of User A or User B in UsersA+B+C2 filter",
          topUser.userId === userAId || topUser.userId === userBId,
        );
      }
    }
  }
}
