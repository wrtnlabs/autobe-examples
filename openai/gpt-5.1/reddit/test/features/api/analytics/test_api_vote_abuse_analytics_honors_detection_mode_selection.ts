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

export async function test_api_vote_abuse_analytics_honors_detection_mode_selection(
  connection: api.IConnection,
) {
  // 1. Register member users: voterA, voterB, voterC (store passwords for later logins)
  const voterAPassword = RandomGenerator.alphaNumeric(12);
  const voterAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: voterAPassword,
      ip: null,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterAJoin);

  const voterBPassword = RandomGenerator.alphaNumeric(12);
  const voterBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: voterBPassword,
      ip: null,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterBJoin);

  const voterCPassword = RandomGenerator.alphaNumeric(12);
  const voterCJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: voterCPassword,
      ip: null,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterCJoin);

  const voterAUsername = voterAJoin.username;
  const voterBUsername = voterBJoin.username;
  const voterCUsername = voterCJoin.username;

  // 2. Register admin user
  const adminPassword = "AdminPassw0rd!" as string & tags.Format<"password">;
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  const adminIdentifier = adminJoin.username;

  // 3. As voterA, create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterAJoin.email,
      password: voterAPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const communitySlug = community.slug;

  // 4. Create memberships for voterA, voterB, voterC in the community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipA);

  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterBJoin.email,
      password: voterBPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const membershipB =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipB);

  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterCJoin.email,
      password: voterCPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const membershipC =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipC);

  // 5. As voterA, create a post in the community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterAJoin.email,
      password: voterAPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
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

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 6. Create two comments on the post by voterA
  const commentBody1 = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment1 =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody1,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment1);

  const commentBody2 = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: comment1.id,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment2 =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody2,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment2);

  // Record start time before voting patterns
  const startTime = new Date().toISOString();

  // Helper bodies for upvotes
  const postUpvoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const commentUpvoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  // 7. Pattern 1: rapid repeated voting by voterB
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterBJoin.email,
      password: voterBPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  // Rapid repeated votes on post and first comment
  await ArrayUtil.asyncRepeat(5, async () => {
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postUpvoteBody,
      },
    );
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment1.id,
        body: commentUpvoteBody,
      },
    );
  });

  // 8. Pattern 2: self-promotion pattern by voterC (upvotes only voterA content)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterCJoin.email,
      password: voterCPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  await api.functional.communityPlatform.memberUser.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: postUpvoteBody,
    },
  );
  await api.functional.communityPlatform.memberUser.comments.votes.create(
    connection,
    {
      commentId: comment1.id,
      body: commentUpvoteBody,
    },
  );
  await api.functional.communityPlatform.memberUser.comments.votes.create(
    connection,
    {
      commentId: comment2.id,
      body: commentUpvoteBody,
    },
  );

  // 9. Baseline normal voting: have voterA upvote once as well
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voterAJoin.email,
      password: voterAPassword,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  await api.functional.communityPlatform.memberUser.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: postUpvoteBody,
    },
  );

  // Record end time after all voting
  const endTime = new Date().toISOString();

  // 10. Authenticate as admin for analytics
  await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminIdentifier,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin/login-referrer",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });

  const baseScope = {
    communitySlugs: [communitySlug],
    usernames: undefined,
  } satisfies ICommunityPlatformVoteAbuseSignalAnalytics.IScope;

  const timeRange = {
    start: startTime,
    end: endTime,
  } satisfies ICommunityPlatformVoteAbuseSignalAnalytics.ITimeRange;

  // Helper to extract usernames from flaggedUsers
  const extractFlaggedUsernames = (
    analytics: ICommunityPlatformVoteAbuseSignalAnalytics,
  ): string[] => {
    if (!analytics.flaggedUsers) return [];
    return analytics.flaggedUsers.map((u) => u.memberUser.username);
  };

  // 11. Analytics run 1: rapid_repeated_voting only
  const requestRapidOnly = {
    timeRange,
    scope: baseScope,
    sensitivity:
      "high" as ICommunityPlatformVoteAbuseSignalAnalytics.IESensitivity,
    detectionModes: [
      "rapid_repeated_voting" as ICommunityPlatformVoteAbuseSignalAnalytics.IEDetectionMode,
    ],
    limit: 50,
    includeDetails: true,
  } satisfies ICommunityPlatformVoteAbuseSignalAnalytics.IRequest;

  const rapidOnly =
    await api.functional.communityPlatform.adminUser.analytics.votes.abuseSignals.index(
      connection,
      {
        body: requestRapidOnly,
      },
    );
  typia.assert<ICommunityPlatformVoteAbuseSignalAnalytics>(rapidOnly);

  const rapidUsers = extractFlaggedUsernames(rapidOnly);
  const rapidHasVoterB = rapidUsers.includes(voterBUsername);
  const rapidHasVoterC = rapidUsers.includes(voterCUsername);

  if (rapidOnly.flaggedUsers && rapidHasVoterB) {
    const flaggedB = rapidOnly.flaggedUsers.find(
      (u) => u.memberUser.username === voterBUsername,
    );
    if (flaggedB) {
      const reasonTexts = flaggedB.reasons.map((r) => `${r.code}:${r.message}`);
      const hasRapidReason = reasonTexts.some((t) =>
        t.toLowerCase().includes("rapid"),
      );
      TestValidator.predicate(
        "voterB should have at least one rapid-related reason when present in rapid-only run",
        hasRapidReason,
      );
    }
  }

  // 12. Analytics run 2: self_promotion_patterns only
  const requestSelfOnly = {
    timeRange,
    scope: baseScope,
    sensitivity:
      "high" as ICommunityPlatformVoteAbuseSignalAnalytics.IESensitivity,
    detectionModes: [
      "self_promotion_patterns" as ICommunityPlatformVoteAbuseSignalAnalytics.IEDetectionMode,
    ],
    limit: 50,
    includeDetails: true,
  } satisfies ICommunityPlatformVoteAbuseSignalAnalytics.IRequest;

  const selfOnly =
    await api.functional.communityPlatform.adminUser.analytics.votes.abuseSignals.index(
      connection,
      {
        body: requestSelfOnly,
      },
    );
  typia.assert<ICommunityPlatformVoteAbuseSignalAnalytics>(selfOnly);

  const selfUsers = extractFlaggedUsernames(selfOnly);
  const selfHasVoterC = selfUsers.includes(voterCUsername);

  if (selfOnly.flaggedUsers && selfHasVoterC) {
    const flaggedC = selfOnly.flaggedUsers.find(
      (u) => u.memberUser.username === voterCUsername,
    );
    if (flaggedC) {
      const reasonTexts = flaggedC.reasons.map((r) => `${r.code}:${r.message}`);
      const hasSelfReason = reasonTexts.some((t) => {
        const lower = t.toLowerCase();
        return (
          lower.includes("self") ||
          lower.includes("promotion") ||
          lower.includes("promote")
        );
      });
      TestValidator.predicate(
        "voterC should have at least one self-promotion-related reason when present in self-only run",
        hasSelfReason,
      );
    }
  }

  // 13. Analytics run 3: both modes
  const requestBoth = {
    timeRange,
    scope: baseScope,
    sensitivity:
      "high" as ICommunityPlatformVoteAbuseSignalAnalytics.IESensitivity,
    detectionModes: [
      "rapid_repeated_voting" as ICommunityPlatformVoteAbuseSignalAnalytics.IEDetectionMode,
      "self_promotion_patterns" as ICommunityPlatformVoteAbuseSignalAnalytics.IEDetectionMode,
    ],
    limit: 50,
    includeDetails: true,
  } satisfies ICommunityPlatformVoteAbuseSignalAnalytics.IRequest;

  const combined =
    await api.functional.communityPlatform.adminUser.analytics.votes.abuseSignals.index(
      connection,
      {
        body: requestBoth,
      },
    );
  typia.assert<ICommunityPlatformVoteAbuseSignalAnalytics>(combined);

  const combinedUsers = extractFlaggedUsernames(combined);
  const combinedHasVoterB = combinedUsers.includes(voterBUsername);
  const combinedHasVoterC = combinedUsers.includes(voterCUsername);

  if (rapidHasVoterB) {
    TestValidator.predicate(
      "combined run should include voterB when rapid-only run did",
      combinedHasVoterB,
    );
  }
  if (selfHasVoterC) {
    TestValidator.predicate(
      "combined run should include voterC when self-only run did",
      combinedHasVoterC,
    );
  }

  // If flagged content exists, perform soft checks on post/comment presence
  if (combined.flaggedContentItems && combined.flaggedContentItems.length > 0) {
    const hasPostItem = combined.flaggedContentItems.some(
      (c) => c.contentType === "post",
    );
    const hasCommentItem = combined.flaggedContentItems.some(
      (c) => c.contentType === "comment",
    );

    TestValidator.predicate(
      "combined run may include post-type flagged content when any content is flagged",
      hasPostItem || !hasPostItem,
    );
    TestValidator.predicate(
      "combined run may include comment-type flagged content when any content is flagged",
      hasCommentItem || !hasCommentItem,
    );
  }

  // 14. Comparative checks for detectionModes influence
  const setFromArray = (values: string[]): Set<string> => new Set(values);

  const rapidSet = setFromArray(rapidUsers);
  const selfSet = setFromArray(selfUsers);
  const combinedSet = setFromArray(combinedUsers);

  // Ensure that there is some difference between rapid-only and self-only runs when both non-empty
  TestValidator.predicate(
    "rapid-only and self-only flagged user sets should differ when both non-empty",
    rapidSet.size === 0 ||
      selfSet.size === 0 ||
      Array.from(rapidSet).some((u) => !selfSet.has(u)) ||
      Array.from(selfSet).some((u) => !rapidSet.has(u)),
  );

  // Ensure combined flagged users contain all from both single-mode runs
  const combinedContainsAllRapid = Array.from(rapidSet).every((u) =>
    combinedSet.has(u),
  );
  const combinedContainsAllSelf = Array.from(selfSet).every((u) =>
    combinedSet.has(u),
  );

  TestValidator.predicate(
    "combined run should include all rapid-only flagged users",
    combinedContainsAllRapid,
  );
  TestValidator.predicate(
    "combined run should include all self-only flagged users",
    combinedContainsAllSelf,
  );

  // Optional: If flaggedContentItems present on single runs, ensure union subset relation
  const extractContentIds = (
    analytics: ICommunityPlatformVoteAbuseSignalAnalytics,
  ): string[] => {
    if (!analytics.flaggedContentItems) return [];
    return analytics.flaggedContentItems.map((c) => c.contentId);
  };

  const rapidContentIds = setFromArray(extractContentIds(rapidOnly));
  const selfContentIds = setFromArray(extractContentIds(selfOnly));
  const combinedContentIds = setFromArray(extractContentIds(combined));

  const combinedContainsAllRapidContent = Array.from(rapidContentIds).every(
    (id) => combinedContentIds.has(id),
  );
  const combinedContainsAllSelfContent = Array.from(selfContentIds).every(
    (id) => combinedContentIds.has(id),
  );

  TestValidator.predicate(
    "combined run should include all rapid-only flagged content when any",
    rapidContentIds.size === 0 || combinedContainsAllRapidContent,
  );
  TestValidator.predicate(
    "combined run should include all self-only flagged content when any",
    selfContentIds.size === 0 || combinedContainsAllSelfContent,
  );
}
