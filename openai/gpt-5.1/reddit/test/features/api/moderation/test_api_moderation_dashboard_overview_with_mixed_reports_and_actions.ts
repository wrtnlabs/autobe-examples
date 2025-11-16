import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboard";
import type { ICommunityPlatformModerationDashboardAccountRestrictionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardAccountRestrictionSummary";
import type { ICommunityPlatformModerationDashboardActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardActionSummary";
import type { ICommunityPlatformModerationDashboardReportBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardReportBreakdown";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_moderation_dashboard_overview_with_mixed_reports_and_actions(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser (will be used both as content author and as reporting actor)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Switch back to memberUser explicitly to ensure reporting and content are created as memberUser
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 3. As memberUser, create a community
  const communitySlug = `community-${RandomGenerator.alphabets(6)}`;
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. As memberUser, create a membership in the community, then a comment on the post
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

  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. As memberUser, create various report records
  // 6-1. Post report
  const postReportCreateBody = {
    post_id: post.id,
    reason_category: "spam",
    reason_detail: "Looks like spam content in the post body.",
    severity: "medium",
  } satisfies ICommunityPlatformPostReport.ICreate;
  const postReport: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.memberUser.postReports.create(
      connection,
      {
        body: postReportCreateBody,
      },
    );
  typia.assert(postReport);

  // 6-2. Comment report
  const commentReportCreateBody = {
    comment_id: comment.id,
    reason_category: "abuse",
    reason_detail: "Offensive language in the comment.",
  } satisfies ICommunityPlatformCommentReport.ICreate;
  const commentReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: commentReportCreateBody,
      },
    );
  typia.assert(commentReport);

  // 6-3. Community report
  const communityReportCreateBody = {
    community_id: community.id,
    reason_category: "policy_violation",
    reason_detail: "Community appears to violate global content policies.",
  } satisfies ICommunityPlatformCommunityReport.ICreate;
  const communityReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: communityReportCreateBody,
      },
    );
  typia.assert(communityReport);

  // 6-4. User report (memberUser reports another member; here we reuse the same member as both reporter and target for simplicity)
  const userReportCreateBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "harassment",
    reason_detail: "Reported for testing purposes.",
    status: "open",
    severity: "low",
  } satisfies ICommunityPlatformUserReport.ICreate;
  const userReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: userReportCreateBody,
      },
    );
  typia.assert(userReport);

  // 7. Switch to adminUser, then create a moderation case
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const moderationCaseCreateBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test moderation case for dashboard aggregation",
    description:
      "Aggregates multiple reports and actions for the dashboard E2E scenario.",
    status: "open",
    priority: "medium",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;
  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseCreateBody,
      },
    );
  typia.assert(moderationCase);

  // 8. As adminUser, create an account restriction episode
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const restrictionCreateBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: "Temporary posting restriction for testing.",
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;
  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionCreateBody,
      },
    );
  typia.assert(restriction);

  // 9. As adminUser, create a moderation action linked to the case and restriction
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: "Applied restriction as part of test case.",
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 10. As adminUser, fetch the moderation dashboard overview
  const dashboard: ICommunityPlatformModerationDashboard =
    await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
      connection,
    );
  typia.assert(dashboard);

  // 11. Business assertions on dashboard aggregates
  TestValidator.predicate(
    "postReportBreakdown.total should be >= 1 after creating a post report",
    dashboard.postReportBreakdown.total >= 1,
  );
  TestValidator.predicate(
    "commentReportBreakdown.total should be >= 1 after creating a comment report",
    dashboard.commentReportBreakdown.total >= 1,
  );
  TestValidator.predicate(
    "communityReportBreakdown.total should be >= 1 after creating a community report",
    dashboard.communityReportBreakdown.total >= 1,
  );
  TestValidator.predicate(
    "userReportBreakdown.total should be >= 1 after creating a user report",
    dashboard.userReportBreakdown.total >= 1,
  );

  TestValidator.predicate(
    "recentReportCount should be >= 1 after creating multiple reports",
    dashboard.recentReportCount >= 1,
  );

  TestValidator.predicate(
    "recentModerationActions.totalActions should be >= 1 after creating a moderation action",
    dashboard.recentModerationActions.totalActions >= 1,
  );

  TestValidator.predicate(
    "activeAccountRestrictions.totalActiveRestrictions should be >= 1 after creating a restriction",
    dashboard.activeAccountRestrictions.totalActiveRestrictions >= 1,
  );

  TestValidator.predicate(
    "at least one moderation case counter should be >= 1 (open/inProgress/resolved)",
    dashboard.openCaseCount >= 1 ||
      dashboard.inProgressCaseCount >= 1 ||
      dashboard.resolvedCaseCount >= 1,
  );
}
