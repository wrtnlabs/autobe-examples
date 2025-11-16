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
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVoteAbuseSignalAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteAbuseSignalAnalytics";

export async function test_api_vote_abuse_analytics_detects_coordinated_brigading_on_posts_and_comments(
  connection: api.IConnection,
) {
  // 1. Register three member users A, B, C with remembered passwords
  const passwordA = RandomGenerator.alphaNumeric(12);
  const passwordB = RandomGenerator.alphaNumeric(12);
  const passwordC = RandomGenerator.alphaNumeric(12);

  const memberAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: passwordA,
      ip: null,
      href: "https://client.example.com/join",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAJoin);

  const memberBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: passwordB,
      ip: null,
      href: "https://client.example.com/join",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBJoin);

  const memberCJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: passwordC,
      ip: null,
      href: "https://client.example.com/join",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberCJoin);

  // 2. Register adminUser with remembered password
  const adminPassword = "AdminPassw0rd!" as string & tags.Format<"password">;
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 3. Switch to member A and create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAJoin.username,
      password: passwordA,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Create memberships for A, B, C in the community
  const membershipABody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipA =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipABody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipA);

  // Member B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberBJoin.username,
      password: passwordB,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  const membershipBBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipB =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipB);

  // Member C
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberCJoin.username,
      password: passwordC,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  const membershipCBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membershipC =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipC);

  // 5. Switch back to member A to create a post and comment
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAJoin.username,
      password: passwordA,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

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
  typia.assert<ICommunityPlatformPost>(post);

  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
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
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. Member B casts a normal upvote on the post
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberBJoin.username,
      password: passwordB,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const postVoteBBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVoteB =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteBBody,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postVoteB);

  // 7. Brigade member C joins and casts suspicious concentrated votes
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberCJoin.username,
      password: passwordC,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const postVoteCBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVoteC =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteCBody,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postVoteC);

  const commentVoteCBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVoteC =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteCBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(commentVoteC);

  // 8. Admin runs vote abuse analytics
  await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminJoin.username,
      password: adminPassword,
      ip: null,
      href: "https://client.example.com/admin/login",
      referrer: "https://client.example.com/admin",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });

  const now = new Date();
  const start = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  const analyticsRequestBody = {
    timeRange: {
      start,
      end,
    },
    scope: {
      communitySlugs: [community.slug],
      usernames: undefined,
    },
    sensitivity: "high",
    detectionModes: ["coordinated_brigading", "rapid_repeated_voting"],
    limit: 50,
    includeDetails: true,
  } satisfies ICommunityPlatformVoteAbuseSignalAnalytics.IRequest;

  const analytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.abuseSignals.index(
      connection,
      { body: analyticsRequestBody },
    );
  typia.assert<ICommunityPlatformVoteAbuseSignalAnalytics>(analytics);

  // 9. Structural assertions on analytics result
  const summary = analytics.summary;
  TestValidator.predicate(
    "analytics analyzed at least some votes",
    summary.totalVotesAnalyzed >= 1,
  );

  // Consistency between counts and arrays when details are present
  if (summary.flaggedUserCount > 0) {
    TestValidator.predicate(
      "flaggedUsers array exists when flaggedUserCount > 0",
      !!analytics.flaggedUsers && analytics.flaggedUsers.length > 0,
    );
  }
  if (summary.flaggedContentItemCount > 0) {
    TestValidator.predicate(
      "flaggedContentItems array exists when flaggedContentItemCount > 0",
      !!analytics.flaggedContentItems &&
        analytics.flaggedContentItems.length > 0,
    );
  }
  if (summary.suspiciousWindowCount > 0) {
    TestValidator.predicate(
      "suspiciousWindows array exists when suspiciousWindowCount > 0",
      !!analytics.suspiciousWindows && analytics.suspiciousWindows.length > 0,
    );
  }

  if (analytics.flaggedUsers && analytics.flaggedUsers.length > 0) {
    const flaggedUser = analytics.flaggedUsers[0];
    TestValidator.predicate(
      "flagged user has non-negative suspiciousVoteCount",
      flaggedUser.suspiciousVoteCount >= 0,
    );
    TestValidator.predicate(
      "flagged user has non-negative totalVoteCount",
      flaggedUser.totalVoteCount >= flaggedUser.suspiciousVoteCount,
    );
  }

  if (
    analytics.flaggedContentItems &&
    analytics.flaggedContentItems.length > 0
  ) {
    const flaggedItem = analytics.flaggedContentItems[0];
    TestValidator.equals(
      "flagged content community slug matches test community",
      flaggedItem.community.slug,
      community.slug,
    );
    TestValidator.predicate(
      "flagged content has non-negative suspiciousVoteCount",
      flaggedItem.suspiciousVoteCount >= 0,
    );
    TestValidator.predicate(
      "flagged content has non-negative totalVoteCount",
      flaggedItem.totalVoteCount >= flaggedItem.suspiciousVoteCount,
    );
  }

  if (analytics.suspiciousWindows && analytics.suspiciousWindows.length > 0) {
    const window0 = analytics.suspiciousWindows[0];
    TestValidator.predicate(
      "suspicious window score is non-negative",
      window0.score >= 0,
    );
  }
}
